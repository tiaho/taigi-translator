#!/usr/bin/env python3
"""
Validate and Fix Lesson Plan Vocabulary with Unicode Normalization
"""

import re
import requests
import time
import unicodedata
from pathlib import Path

# Backend API endpoint
API_URL = "http://127.0.0.1:5001/api/romanize"

def normalize_text(text):
    """Normalize to NFC (precomposed) form and remove spaces/hyphens for comparison"""
    normalized = unicodedata.normalize('NFC', text)
    return normalized.replace(' ', '').replace('-', '')

def call_api(taiwanese_text):
    """Call the backend translator API"""
    try:
        response = requests.post(
            API_URL,
            json={"text": taiwanese_text},
            headers={"Content-Type": "application/json"},
            timeout=15
        )

        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return {
                    'han': data.get('hanCharacters', ''),
                    'romanization': data.get('romanization', ''),
                    'success': True
                }
        return {'success': False, 'error': f"HTTP {response.status_code}: {response.text}"}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def parse_vocab_line(line):
    """
    Parse vocabulary line: - Taiwanese (romanization) → Mandarin (pinyin) - English
    """
    # Match pattern: - WORD (ROMANIZATION) → WORD (PINYIN) - ENGLISH
    pattern = r'^-\s+([^\(]+)\s+\(([^\)]+)\)\s+→\s+([^\(]+)\s+\(([^\)]+)\)\s+-\s+(.+)$'
    match = re.match(pattern, line.strip())

    if match:
        return {
            'taiwanese': match.group(1).strip(),
            'romanization': match.group(2).strip(),
            'mandarin': match.group(3).strip(),
            'pinyin': match.group(4).strip(),
            'english': match.group(5).strip(),
            'original_line': line
        }
    return None

def main():
    lesson_plan_path = Path(__file__).parent.parent.parent / 'LESSON_PLAN.md'
    mismatches_file = Path(__file__).parent / 'mismatches.txt'

    if not lesson_plan_path.exists():
        print(f"❌ File not found: {lesson_plan_path}")
        return 1

    print("="*80)
    print("LESSON PLAN VOCABULARY VALIDATOR (with Unicode Normalization)")
    print("="*80)
    print(f"\nReading: {lesson_plan_path}")
    print(f"Writing mismatches to: {mismatches_file}\n")

    with open(lesson_plan_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Open mismatches file for real-time writing
    mismatch_log = open(mismatches_file, 'w', encoding='utf-8')
    mismatch_log.write("="*80 + "\n")
    mismatch_log.write("REAL MISMATCHES FOUND\n")
    mismatch_log.write("="*80 + "\n\n")
    mismatch_log.flush()

    issues = []
    checked = 0
    current_unit = ""

    print("="*80)
    print("VALIDATING ALL VOCABULARY...")
    print("="*80)
    print()

    for i, line in enumerate(lines, 1):
        # Track current unit
        if line.startswith('### Unit '):
            current_unit = line.strip()
            print(f"\n{current_unit}")
            print("-"*80)

        vocab = parse_vocab_line(line)
        if not vocab:
            continue

        checked += 1
        taiwanese = vocab['taiwanese']
        current_rom = vocab['romanization']
        english = vocab['english']

        print(f"[{checked}] {taiwanese} - {english}")

        # Call API
        result = call_api(taiwanese)

        if not result['success']:
            print(f"  ⚠️  API Error: {result.get('error', 'Unknown')}")
            issues.append({
                'line': i,
                'unit': current_unit,
                'taiwanese': taiwanese,
                'english': english,
                'issue': 'API_ERROR',
                'error': result.get('error', 'Unknown'),
                'original_line': vocab['original_line']
            })
        else:
            api_rom = result['romanization']

            # Normalize both for comparison
            current_norm = normalize_text(current_rom)
            api_norm = normalize_text(api_rom)

            if current_norm == api_norm:
                # Check if just Unicode normalization difference
                if current_rom != api_rom:
                    print(f"  ⚡ Unicode difference (functionally correct)")
                    print(f"     Current: {current_rom}")
                    print(f"     API:     {api_rom}")
                else:
                    print(f"  ✅ Perfect match: {current_rom}")
            else:
                print(f"  ❌ MISMATCH!")
                print(f"     Current: {current_rom}")
                print(f"     API:     {api_rom}")

                # Write mismatch to file immediately
                mismatch_log.write(f"{current_unit}\n")
                mismatch_log.write(f"Line {i}: {taiwanese} - {english}\n")
                mismatch_log.write(f"  Current: {current_rom}\n")
                mismatch_log.write(f"  Correct: {api_rom}\n\n")
                mismatch_log.flush()

                issues.append({
                    'line': i,
                    'unit': current_unit,
                    'taiwanese': taiwanese,
                    'english': english,
                    'issue': 'MISMATCH',
                    'current_rom': current_rom,
                    'api_rom': api_rom,
                    'original_line': vocab['original_line']
                })

        # Rate limiting
        time.sleep(0.3)

    # Print summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total vocabulary items checked: {checked}")
    print(f"Real mismatches found: {len([i for i in issues if i['issue'] == 'MISMATCH'])}")
    print(f"API errors: {len([i for i in issues if i['issue'] == 'API_ERROR'])}")
    print()

    if issues:
        mismatches = [i for i in issues if i['issue'] == 'MISMATCH']

        if mismatches:
            print("="*80)
            print("MISMATCHES TO FIX")
            print("="*80)
            print()

            for issue in mismatches:
                print(f"{issue['unit']}")
                print(f"Line {issue['line']}: {issue['taiwanese']} - {issue['english']}")
                print(f"  Current: {issue['current_rom']}")
                print(f"  Correct: {issue['api_rom']}")
                print()

            # Ask if user wants to apply fixes
            print("="*80)
            response = input("Apply these fixes to LESSON_PLAN.md? (y/n): ").strip().lower()

            if response == 'y':
                # Apply fixes
                new_lines = lines.copy()
                for issue in mismatches:
                    line_idx = issue['line'] - 1
                    old_rom = issue['current_rom']
                    new_rom = issue['api_rom']

                    # Replace in the line
                    new_lines[line_idx] = new_lines[line_idx].replace(
                        f"({old_rom})",
                        f"({new_rom})"
                    )

                # Write back
                with open(lesson_plan_path, 'w', encoding='utf-8') as f:
                    f.writelines(new_lines)

                print(f"\n✅ Fixed {len(mismatches)} vocabulary items in LESSON_PLAN.md!")
            else:
                print("\nNo changes made.")

        # Show API errors
        api_errors = [i for i in issues if i['issue'] == 'API_ERROR']
        if api_errors:
            print("\n" + "="*80)
            print("API ERRORS (need manual review)")
            print("="*80)
            for issue in api_errors:
                print(f"Line {issue['line']}: {issue['taiwanese']} - {issue['english']}")
                print(f"  Error: {issue['error']}")
            print()
    else:
        print("✅ All vocabulary items are correct!")

    # Close the mismatch log file
    mismatch_log.close()
    print(f"\nMismatches written to: {mismatches_file}")

    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
