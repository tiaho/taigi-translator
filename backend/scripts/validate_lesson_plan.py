#!/usr/bin/env python3
"""
Validate and Fix Lesson Plan Vocabulary
Checks all Taiwanese translations in LESSON_PLAN.md against the backend translator
"""

import re
import requests
import time
from pathlib import Path

# Backend API endpoint
API_URL = "http://127.0.0.1:5001/api/romanize"

def call_translator(mandarin_text):
    """Call the backend translator API to get Taiwanese translation"""
    try:
        response = requests.post(
            API_URL,
            json={
                "text": mandarin_text,
                "source_language": "mandarin"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return {
                    'han': data.get('hanCharacters', ''),
                    'romanization': data.get('romanization', ''),
                    'success': True
                }
        return {'success': False, 'error': f"HTTP {response.status_code}"}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def parse_vocab_line(line):
    """
    Parse a vocabulary line in format:
    - Taiwanese (romanization) → Mandarin (pinyin) - English

    Returns: (taiwanese, romanization, mandarin, pinyin, english) or None
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

    if not lesson_plan_path.exists():
        print(f"❌ File not found: {lesson_plan_path}")
        return 1

    print("=" * 80)
    print("LESSON PLAN VOCABULARY VALIDATOR")
    print("=" * 80)
    print(f"\nReading: {lesson_plan_path}")

    with open(lesson_plan_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    issues = []
    checked = 0
    line_num = 0

    print("\n" + "=" * 80)
    print("CHECKING VOCABULARY ITEMS...")
    print("=" * 80 + "\n")

    for i, line in enumerate(lines, 1):
        vocab = parse_vocab_line(line)
        if not vocab:
            continue

        line_num = i
        checked += 1
        mandarin = vocab['mandarin']
        current_taiwanese = vocab['taiwanese']
        current_romanization = vocab['romanization']

        print(f"[{checked}] Line {i}: {mandarin}")
        print(f"  Current: {current_taiwanese} ({current_romanization})")

        # Call API
        result = call_translator(mandarin)

        if not result['success']:
            print(f"  ⚠️  API Error: {result.get('error', 'Unknown')}")
            issues.append({
                'line': i,
                'mandarin': mandarin,
                'issue': 'API_ERROR',
                'current': f"{current_taiwanese} ({current_romanization})",
                'error': result.get('error', 'Unknown')
            })
        else:
            correct_taiwanese = result['han']
            correct_romanization = result['romanization']

            print(f"  Correct: {correct_taiwanese} ({correct_romanization})")

            # Check if they match
            if current_taiwanese != correct_taiwanese or current_romanization != correct_romanization:
                print(f"  ❌ MISMATCH!")
                issues.append({
                    'line': i,
                    'mandarin': mandarin,
                    'english': vocab['english'],
                    'issue': 'MISMATCH',
                    'current_taiwanese': current_taiwanese,
                    'current_romanization': current_romanization,
                    'correct_taiwanese': correct_taiwanese,
                    'correct_romanization': correct_romanization,
                    'original_line': vocab['original_line']
                })
            else:
                print(f"  ✅ OK")

        print()

        # Rate limiting
        time.sleep(0.5)

    # Print summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total vocabulary items checked: {checked}")
    print(f"Issues found: {len(issues)}")
    print()

    if issues:
        print("=" * 80)
        print("ISSUES FOUND")
        print("=" * 80 + "\n")

        for issue in issues:
            print(f"Line {issue['line']}: {issue['mandarin']} - {issue.get('english', '')}")

            if issue['issue'] == 'MISMATCH':
                print(f"  Current:  {issue['current_taiwanese']} ({issue['current_romanization']})")
                print(f"  Correct:  {issue['correct_taiwanese']} ({issue['correct_romanization']})")
                print(f"\n  OLD LINE: {issue['original_line'].strip()}")

                # Generate new line
                new_line = issue['original_line'].replace(
                    f"{issue['current_taiwanese']} ({issue['current_romanization']})",
                    f"{issue['correct_taiwanese']} ({issue['correct_romanization']})"
                )
                print(f"  NEW LINE: {new_line.strip()}")
            elif issue['issue'] == 'API_ERROR':
                print(f"  Current: {issue['current']}")
                print(f"  Error: {issue['error']}")

            print()

        # Ask if user wants to apply fixes
        print("=" * 80)
        response = input("Apply these fixes to LESSON_PLAN.md? (y/n): ")

        if response.lower() == 'y':
            # Apply fixes
            new_lines = lines.copy()
            for issue in issues:
                if issue['issue'] == 'MISMATCH':
                    line_idx = issue['line'] - 1
                    new_lines[line_idx] = issue['original_line'].replace(
                        f"{issue['current_taiwanese']} ({issue['current_romanization']})",
                        f"{issue['correct_taiwanese']} ({issue['correct_romanization']})"
                    )

            # Write back
            with open(lesson_plan_path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)

            print(f"\n✅ Fixed {len([i for i in issues if i['issue'] == 'MISMATCH'])} vocabulary items!")
        else:
            print("\nNo changes made.")
    else:
        print("✅ All vocabulary items are correct!")

    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
