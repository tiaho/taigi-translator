#!/usr/bin/env python3
"""
Apply All Approved Fixes to LESSON_PLAN.md
Based on manual review of all 50 mismatches
"""

from pathlib import Path

def main():
    lesson_plan_path = Path(__file__).parent.parent.parent / 'LESSON_PLAN.md'

    if not lesson_plan_path.exists():
        print(f"❌ File not found: {lesson_plan_path}")
        return 1

    print("=" * 80)
    print("APPLYING APPROVED FIXES TO LESSON_PLAN.md")
    print("=" * 80)
    print(f"\nReading: {lesson_plan_path}\n")

    with open(lesson_plan_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Dictionary of fixes: line_number -> (old_text, new_text)
    # Format: Find and replace the entire vocabulary line
    fixes = {
        41: ('- 食飽未 (tsia̍h-pá-buē)', '- 食飽未 (Tsia̍h-pá-buē?)'),
        94: ('- 零 (lîng)', '- 空 (khòng)'),
        96: ('- 二/兩 (nn̄g)', '- 二/兩 (nn̄g/jī)'),
        109: ('- 偌濟 (jua̍h-tsē/guā-tsē)', '- 偌濟 (guā-tsē?)'),
        219: ('- 魚 (hî/hû)', '- 魚 (hî)'),
        224: ('- 夭壽好食 (iau-siū-hó-tsia̍h)', '- 誠好食 (tsiânn hó-tsia̍h)'),
        229: ('- 辣 (lo̍ah)', '- 薟 (hiam)'),
        287: ('- 買 (bé/bué)', '- 買 (bé)'),
        288: ('- 賣 (bē/buē)', '- 賣 (bē)'),
        371: ('- 昨日 (tsa-ji̍t)', '- 昨昏 (tsa-hng)'),
        372: ('- 這禮拜 (tsit-lé-pài)', '- 這禮拜 (Tsit lé-pài)'),
        380: ('- 規日 (kui-ji̍t)', '- 規工 (kui-kang)'),
        433: ('- 醫院 (i-īnn)', '- 醫院 (pēnn-īnn)'),
        455: ('- 近 (kīn/kūn)', '- 近 (kīn)'),
        504: ('- 火車 (hué-tshia / hé-tshia)', '- 火車 (hué-tshia)'),
        507: ('- 飛行機 (hui-hîng-ki)', '- 飛行機 (hue-lîng-ki)'),
        523: ('- 幾號 (kuí-hō)', '- 幾號 (Kuí hō)'),
        568: ('- 月 (gue̍h/ge̍h)', '- 月 (gue̍h)'),
        575: ('- 爍爁 (sih-nà)', '- 爍爁 (sih-nah)'),
        654: ('- 病 (pēnn/pīnn)', '- 病 (pēnn)'),
        656: ('- 頭殼痛 (thâu-khak-thiànn)', '- 頭疼 (thâu-thiànn)'),
        661: ('- 喉嚨痛 (âu-nâ-thiànn)', '- 嚨喉痛 (nâ-âu-thiànn)'),
        726: ('- 行山 (kiânn-suann)', '- 𬦰山 (peh-suann)'),
        783: ('- 工程師 (kang-thîng-su)', '- 工程師 (kang-tîng-su)'),
        798: ('- 薪水 (sin-tsuí)', '- 薪水 (sin-suí)'),
        801: ('- 開會 (khai-huē)', '- 開會 (khui-huē)'),
        842: ('- 端午節 (tuan-ngóo-tseh)', '- 端午節 (Gōo-ji̍t-tseh)'),
        847: ('- 粽仔 (tsàng-á)', '- 肉粽 (bah-tsàng)'),
        850: ('- 鞭炮 (pian-phàu)', '- 鞭炮 (phàu-á)'),
        909: ('- 緊張 (kín-tiuⁿ)', '- 緊張 (kín-tiunn)'),
        915: ('- 無好 (bô-hó)', '- 毋好 (m̄ hó)'),
    }

    changes_made = 0

    for line_num, (old_text, new_text) in fixes.items():
        line_idx = line_num - 1  # Convert to 0-indexed

        if old_text in lines[line_idx]:
            lines[line_idx] = lines[line_idx].replace(old_text, new_text)
            changes_made += 1
            print(f"✅ Line {line_num}: {old_text} → {new_text}")
        else:
            print(f"⚠️  Line {line_num}: Could not find '{old_text}'")
            print(f"    Current line: {lines[line_idx].strip()}")

    # Write back
    with open(lesson_plan_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print(f"\n{'=' * 80}")
    print(f"SUMMARY")
    print(f"{'=' * 80}")
    print(f"Total fixes applied: {changes_made}/{len(fixes)}")
    print(f"\n✅ Updated {lesson_plan_path}")

    return 0

if __name__ == '__main__':
    import sys
    sys.exit(main())
