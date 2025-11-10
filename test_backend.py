#!/usr/bin/env python3
"""
Simple test script for the TauPhahJi backend
"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from tauphahji_cmd import tàuphahjī
import json

def test_tauphahji():
    test_texts = [
        '你好',
        '食飽未',
        '多謝',
    ]

    print("Testing TauPhahJi...")
    for text in test_texts:
        print(f"\nInput: {text}")
        try:
            result = tàuphahjī(text)
            print(f"Output: {json.dumps(result, ensure_ascii=False, indent=2)}")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_tauphahji()
