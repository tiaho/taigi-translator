#!/usr/bin/env python3
"""
Dictionary Entry Scoring Script
Ranks MOE dictionary entries by importance/frequency for audio pre-generation
"""

import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

# Essential word categories
ESSENTIAL_CATEGORIES = {
    'numbers': [
        '零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
        '百', '千', '萬', '兩', '偌濟', '幾', '第', '半', '雙', '對'
    ],

    'pronouns': [
        '我', '你', '伊', '咱', '恁', '𪜶', '家己', '啥物', '佗位', '啥人',
        '這', '彼', '遮', '遐', '怹', '阮'
    ],

    'particles': [
        '的', '是', '佇', '咧', '去', '來', '會', '欲', '愛', '有',
        '無', '毋', '未', '矣', '啦', '喔', '咧', '呢', '佮', '抑',
        '著', '予', '乎', '共', '甲', '嘛', '也', '就', '才', '若'
    ],

    'basic_verbs': [
        '食', '飲', '行', '走', '坐', '徛', '睏', '看', '聽', '講',
        '讀', '寫', '買', '賣', '做', '提', '用', '開', '關', '想',
        '知', '會曉', '驚', '落', '起', '來', '去', '轉', '入', '出',
        '穿', '脫', '洗', '煮', '炒', '煎', '掃', '抹', '拭', '擦'
    ],

    'basic_adjectives': [
        '好', '歹', '大', '細', '長', '短', '懸', '低', '厚', '薄',
        '闊', '狹', '重', '輕', '新', '舊', '少年', '老', '媠', '䆀',
        '熱', '寒', '燒', '涼', '甜', '鹹', '酸', '苦', '辣', '淡',
        '真', '誠', '足', '濟', '少', '遠', '近', '快', '慢', '早',
        '晏', '深', '淺', '利', '鈍', '清', '濁', '乾', '溼'
    ],

    'time': [
        '今仔日', '明仔載', '昨日', '透早', '下晡', '暗時', '點鐘',
        '禮拜', '月', '年', '這馬', '時間', '當時', '頭仔', '尾仔',
        '頂禮拜', '下禮拜', '拜一', '拜二', '拜三', '拜四', '拜五',
        '拜六', '拜日', '頂個月', '下個月', '舊年', '後年', '前年',
        '日', '工', '暝', '時', '分', '秒', '鐘頭', '春天', '夏天',
        '秋天', '冬天', '寒天', '熱天'
    ],

    'family': [
        '阿爸', '阿母', '阿兄', '阿姊', '小弟', '小妹', '阿公', '阿媽',
        '外公', '外媽', '囡仔', '查埔', '查某', '翁', '某', '人客',
        '親情', '序大', '序細', '厝內', '兜', '爸', '母', '兒',
        '查埔囡', '查某囡', '後生', '查某囝', '孫', '曾孫', '阿伯',
        '阿叔', '阿姑', '阿舅', '阿姨', '姑丈', '姨丈'
    ],

    'body': [
        '頭殼', '面', '目睭', '鼻仔', '喙', '耳仔', '手', '跤', '身軀',
        '心臟', '肚', '皮', '骨', '血', '喙齒', '頭毛', '頷頸', '肩胛',
        '胸', '背脊', '腰', '尻川', '膝頭', '手指頭', '跤指頭',
        '目眉', '喙鬚', '心肝', '肺', '胃', '腸', '膽', '肝', '腎'
    ],

    'food': [
        '飯', '菜', '肉', '魚', '蛋', '水', '茶', '酒', '湯', '粥',
        '麵', '粿', '糖', '鹽', '油', '豆', '米', '麥', '果子', '菜蔬',
        '豬肉', '牛肉', '雞肉', '鴨肉', '飲料', '豆油', '醬油', '醋',
        '麻油', '蔥', '蒜', '薑', '辣椒', '豆腐', '豆奶', '奶',
        '麵包', '餅', '糕', '粽', '包仔', '饅頭'
    ],

    'colors': [
        '紅', '白', '烏', '青', '黃', '綠', '藍', '紫', '灰', '粉紅',
        '茶色', '金', '銀', '透明', '烏白'
    ],

    'basic_nouns': [
        '人', '厝', '車', '門', '窗仔', '桌', '椅', '床', '冊', '紙',
        '筆', '刀', '鉸刀', '碗', '盤', '杯仔', '箸', '湯匙', '鼎',
        '甕', '缸', '桶', '籃', '袋仔', '布', '衫', '褲', '鞋', '帽仔',
        '錢', '物件', '代誌', '所在', '路', '橋', '山', '海', '溪',
        '湖', '樹', '花', '草', '田', '園', '厝邊', '店', '學校',
        '醫院', '公園', '廟', '教堂', '市場', '銀行', '郵局'
    ]
}

# Scoring weights
SCORING_WEIGHTS = {
    'word_length': {
        1: 20,
        2: 15,
        3: 10,
        4: 5,
        5: 3
    },
    'synonym_frequency_max': 15,
    'definition_count_max': 10,
    'essential_category_scores': {
        'numbers': 25,
        'pronouns': 25,
        'particles': 20,
        'basic_verbs': 20,
        'basic_adjectives': 20,
        'time': 18,
        'family': 18,
        'body': 15,
        'food': 15,
        'colors': 12,
        'basic_nouns': 12
    },
    'pos_priority': {
        '代': 10,  # Pronoun
        '動': 8,   # Verb
        '形': 7,   # Adjective
        '名': 7,   # Noun
        '副': 6,   # Adverb
        '量': 5,   # Classifier
        '助': 10,  # Particle
        '數': 8    # Number
    }
}


class DictionaryScorer:
    def __init__(self, dict_path):
        print(f"Loading dictionary from {dict_path}...")
        self.dictionary = self.load_dictionary(dict_path)
        print(f"Loaded {len(self.dictionary)} entries")

        print("Building synonym index...")
        self.synonym_index = self.build_synonym_index()
        print(f"Found {len(self.synonym_index)} words appearing as synonyms")

        self.scores = {}
        self.category_map = self.build_category_map()

    def load_dictionary(self, path):
        """Load MOE dictionary"""
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def build_synonym_index(self):
        """Build reverse index: word -> count of appearances as synonym"""
        synonym_counts = defaultdict(int)

        for entry in self.dictionary:
            if 'heteronyms' not in entry:
                continue

            for heteronym in entry['heteronyms']:
                # Get synonyms field
                synonyms_str = heteronym.get('synonyms', '')
                if not synonyms_str:
                    continue

                # Split by comma and count
                synonyms = [s.strip() for s in synonyms_str.split(',') if s.strip()]
                for synonym in synonyms:
                    synonym_counts[synonym] += 1

        return dict(synonym_counts)

    def build_category_map(self):
        """Build map of word -> list of categories"""
        category_map = defaultdict(list)

        for category_name, words in ESSENTIAL_CATEGORIES.items():
            for word in words:
                category_map[word].append(category_name)

        return dict(category_map)

    def calculate_word_length_score(self, word):
        """Score based on character length (shorter = higher score)"""
        length = len(word)
        return SCORING_WEIGHTS['word_length'].get(length, 1)

    def calculate_synonym_score(self, word):
        """Score based on synonym frequency"""
        count = self.synonym_index.get(word, 0)
        # Linear score up to max
        return min(count, SCORING_WEIGHTS['synonym_frequency_max'])

    def calculate_definition_score(self, entry):
        """Score based on number of definitions (indicates versatility)"""
        if 'heteronyms' not in entry:
            return 0

        total_defs = 0
        for heteronym in entry['heteronyms']:
            definitions = heteronym.get('definitions', [])
            total_defs += len(definitions)

        # 2 points per definition, capped
        score = min(total_defs * 2, SCORING_WEIGHTS['definition_count_max'])
        return score

    def calculate_category_score(self, word):
        """Score based on essential category membership"""
        if word not in self.category_map:
            return 0

        categories = self.category_map[word]
        category_scores = SCORING_WEIGHTS['essential_category_scores']

        # Take highest category score
        max_score = max(category_scores.get(cat, 0) for cat in categories)
        return max_score

    def calculate_pos_score(self, entry):
        """Score based on part of speech"""
        if 'heteronyms' not in entry:
            return 0

        max_score = 0
        pos_scores = SCORING_WEIGHTS['pos_priority']

        for heteronym in entry['heteronyms']:
            definitions = heteronym.get('definitions', [])
            for definition in definitions:
                pos_type = definition.get('type', '')
                score = pos_scores.get(pos_type, 0)
                max_score = max(max_score, score)

        return max_score

    def calculate_total_score(self, entry):
        """Combine all scoring factors"""
        word = entry['title']

        scores = {
            'word_length': self.calculate_word_length_score(word),
            'synonym_frequency': self.calculate_synonym_score(word),
            'definition_count': self.calculate_definition_score(entry),
            'essential_category': self.calculate_category_score(word),
            'pos_priority': self.calculate_pos_score(entry)
        }

        total = sum(scores.values())

        return total, scores

    def score_all_entries(self):
        """Score all dictionary entries"""
        print("\nScoring all entries...")

        for i, entry in enumerate(self.dictionary):
            if i % 1000 == 0 and i > 0:
                print(f"  Processed {i}/{len(self.dictionary)} entries...")

            word = entry['title']
            total_score, breakdown = self.calculate_total_score(entry)

            # Get romanization
            romanization = ''
            if 'heteronyms' in entry and entry['heteronyms']:
                romanization = entry['heteronyms'][0].get('trs', '')

            self.scores[word] = {
                'word': word,
                'romanization': romanization,
                'score': total_score,
                'breakdown': breakdown,
                'categories': self.category_map.get(word, []),
                'entry': entry
            }

        print(f"Scored {len(self.scores)} entries")

    def get_top_n(self, n=3000):
        """Get top N entries by score"""
        sorted_entries = sorted(
            self.scores.values(),
            key=lambda x: (-x['score'], x['word'])  # Descending score, then alphabetical
        )
        return sorted_entries[:n]

    def assign_tiers(self, entries):
        """Assign tier levels based on score distribution"""
        tiers = {
            'tier_1': [],
            'tier_2': [],
            'tier_3': []
        }

        for entry in entries:
            score = entry['score']

            if score >= 60:
                tiers['tier_1'].append(entry)
            elif score >= 40:
                tiers['tier_2'].append(entry)
            else:
                tiers['tier_3'].append(entry)

        return tiers

    def export_priority_list(self, output_path, n=3000):
        """Export prioritized list to JSON file"""
        top_entries = self.get_top_n(n)
        tiers = self.assign_tiers(top_entries)

        # Prepare export data (without full entry object)
        export_entries = []
        for entry in top_entries:
            export_entry = {
                'word': entry['word'],
                'romanization': entry['romanization'],
                'score': entry['score'],
                'breakdown': entry['breakdown'],
                'categories': entry['categories']
            }
            export_entries.append(export_entry)

        # Prepare tier summaries
        tier_summaries = {}
        for tier_name, tier_entries in tiers.items():
            if tier_entries:
                tier_summaries[tier_name] = {
                    'count': len(tier_entries),
                    'min_score': min(e['score'] for e in tier_entries),
                    'max_score': max(e['score'] for e in tier_entries),
                    'avg_score': sum(e['score'] for e in tier_entries) / len(tier_entries)
                }

        output_data = {
            'metadata': {
                'total_entries': len(self.dictionary),
                'scored_entries': len(self.scores),
                'top_n': n,
                'generated_at': datetime.now().isoformat(),
                'scoring_criteria': SCORING_WEIGHTS
            },
            'tiers': tier_summaries,
            'entries': export_entries
        }

        # Write to file
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)

        print(f"\nExported priority list to {output_path}")
        print(f"  Tier 1 (score >= 60): {tier_summaries.get('tier_1', {}).get('count', 0)} entries")
        print(f"  Tier 2 (score >= 40): {tier_summaries.get('tier_2', {}).get('count', 0)} entries")
        print(f"  Tier 3 (score >= 25): {tier_summaries.get('tier_3', {}).get('count', 0)} entries")

    def print_top_entries(self, n=50):
        """Print top N entries for validation"""
        top_entries = self.get_top_n(n)

        print(f"\n{'='*80}")
        print(f"TOP {n} HIGHEST-SCORING ENTRIES")
        print(f"{'='*80}")
        print(f"{'Rank':<6} {'Word':<10} {'Romanization':<25} {'Score':<8} {'Categories'}")
        print(f"{'-'*80}")

        for i, entry in enumerate(top_entries, 1):
            categories = ', '.join(entry['categories'][:3]) if entry['categories'] else '-'
            print(f"{i:<6} {entry['word']:<10} {entry['romanization']:<25} {entry['score']:<8} {categories}")

            if i == 20 or i == 50:
                print(f"{'-'*80}")

    def validate_results(self):
        """Sanity check the scoring results"""
        print("\n" + "="*80)
        print("VALIDATION CHECKS")
        print("="*80)

        top_100 = self.get_top_n(100)
        top_100_words = [e['word'] for e in top_100]

        # Essential words that should be in top 100
        must_have = ['我', '你', '伊', '食', '是', '的', '好', '一', '二', '三']

        print("\nChecking essential words in top 100:")
        for word in must_have:
            if word in top_100_words:
                rank = top_100_words.index(word) + 1
                score = self.scores[word]['score']
                print(f"  ✓ '{word}' at rank {rank} (score: {score})")
            else:
                print(f"  ✗ '{word}' NOT in top 100")
                if word in self.scores:
                    print(f"    (actual score: {self.scores[word]['score']})")

        # Score distribution
        all_scores = [entry['score'] for entry in self.scores.values()]
        all_scores.sort(reverse=True)

        print(f"\nScore distribution:")
        print(f"  Highest: {all_scores[0]}")
        print(f"  Top 100: {all_scores[99] if len(all_scores) > 99 else 'N/A'}")
        print(f"  Top 500: {all_scores[499] if len(all_scores) > 499 else 'N/A'}")
        print(f"  Top 1000: {all_scores[999] if len(all_scores) > 999 else 'N/A'}")
        print(f"  Top 3000: {all_scores[2999] if len(all_scores) > 2999 else 'N/A'}")
        print(f"  Median: {all_scores[len(all_scores)//2]}")
        print(f"  Lowest: {all_scores[-1]}")


def main():
    # Paths
    dict_path = Path(__file__).parent.parent / 'moedict-twblg.json'
    output_path = Path(__file__).parent.parent / 'data' / 'priority_entries.json'

    if not dict_path.exists():
        print(f"Error: Dictionary not found at {dict_path}")
        sys.exit(1)

    # Create scorer
    scorer = DictionaryScorer(dict_path)

    # Score all entries
    scorer.score_all_entries()

    # Validate results
    scorer.validate_results()

    # Print top entries
    scorer.print_top_entries(50)

    # Export priority list
    scorer.export_priority_list(output_path, n=3000)

    print("\n" + "="*80)
    print("COMPLETE!")
    print("="*80)


if __name__ == '__main__':
    main()
