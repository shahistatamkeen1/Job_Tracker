from __future__ import annotations

from typing import Any, Dict, List
from types import FunctionType


CHALLENGES: Dict[str, Dict[str, Any]] = {
    "py-two-sum-debug": {
        "id": "py-two-sum-debug",
        "title": "Fix the Two Sum Function",
        "difficulty": "easy",
        "topic": "arrays",
        "language": "python",
        "bug_type": "logic error",
        "description": (
            "The function should return the indices of two numbers whose sum equals the target. "
            "The current code returns the wrong thing."
        ),
        "function_name": "two_sum",
        "expected_behavior": "Return a list of two indices whose values sum to target.",
        "starter_code": """def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [num, diff]   # bug: should return indices
        seen[num] = i
    return []
""",
        "tests": [
            {"input": [[2, 7, 11, 15], 9], "expected": [0, 1]},
            {"input": [[3, 2, 4], 6], "expected": [1, 2]},
            {"input": [[3, 3], 6], "expected": [0, 1]},
        ],
        "hints": [
            "Check what the function is supposed to return: values or indices?",
            "Look at the line inside the `if diff in seen` block.",
            "You already store indices in `seen`. Use them in the return value.",
        ],
    },
    "py-reverse-string-debug": {
        "id": "py-reverse-string-debug",
        "title": "Reverse String Bug",
        "difficulty": "easy",
        "topic": "strings",
        "language": "python",
        "bug_type": "off-by-one / loop error",
        "description": (
            "The function should return the reversed version of a string, "
            "but the current implementation misses characters."
        ),
        "function_name": "reverse_text",
        "expected_behavior": "Return the full string reversed.",
        "starter_code": """def reverse_text(text):
    result = ""
    for i in range(len(text) - 1, 0, -1):   # bug: skips index 0
        result += text[i]
    return result
""",
        "tests": [
            {"input": ["career"], "expected": "reerac"},
            {"input": ["AI"], "expected": "IA"},
            {"input": ["debug"], "expected": "gubed"},
        ],
        "hints": [
            "Look closely at the `range()` boundaries.",
            "When reversing, are you including the character at index 0?",
            "The stop value in Python `range()` is exclusive.",
        ],
    },
    "py-average-debug": {
        "id": "py-average-debug",
        "title": "Average Calculator Bug",
        "difficulty": "medium",
        "topic": "math / lists",
        "language": "python",
        "bug_type": "wrong formula",
        "description": (
            "The function should return the arithmetic average of a list of numbers, "
            "but the current implementation uses the wrong denominator."
        ),
        "function_name": "average_score",
        "expected_behavior": "Return the sum divided by the number of items.",
        "starter_code": """def average_score(scores):
    if not scores:
        return 0
    return sum(scores) / (len(scores) - 1)   # bug: wrong denominator
""",
        "tests": [
            {"input": [[10, 20, 30]], "expected": 20},
            {"input": [[5, 5, 5, 5]], "expected": 5},
            {"input": [[]], "expected": 0},
        ],
        "hints": [
            "Check the denominator in the return statement.",
            "For a list with 4 items, what should you divide by?",
            "The average uses the total count of items, not count minus one.",
        ],
    },
}

SAFE_BUILTINS = {
    "len": len,
    "range": range,
    "sum": sum,
    "min": min,
    "max": max,
    "enumerate": enumerate,
    "list": list,
    "dict": dict,
    "set": set,
    "tuple": tuple,
    "sorted": sorted,
    "abs": abs,
    "all": all,
    "any": any,
    "zip": zip,
}


def list_challenges() -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for challenge in CHALLENGES.values():
        items.append(
            {
                "id": challenge["id"],
                "title": challenge["title"],
                "difficulty": challenge["difficulty"],
                "topic": challenge["topic"],
                "language": challenge["language"],
                "description": challenge["description"],
                "bug_type": challenge["bug_type"],
            }
        )
    return items


def get_challenge(challenge_id: str) -> Dict[str, Any]:
    challenge = CHALLENGES.get(challenge_id)
    if not challenge:
        raise ValueError("Challenge not found")

    return {
        "id": challenge["id"],
        "title": challenge["title"],
        "difficulty": challenge["difficulty"],
        "topic": challenge["topic"],
        "language": challenge["language"],
        "description": challenge["description"],
        "bug_type": challenge["bug_type"],
        "starter_code": challenge["starter_code"],
        "function_name": challenge["function_name"],
        "expected_behavior": challenge["expected_behavior"],
        "hint_count": len(challenge["hints"]),
    }


def get_starter_code(challenge_id: str) -> str:
    challenge = CHALLENGES.get(challenge_id)
    if not challenge:
        raise ValueError("Challenge not found")
    return challenge["starter_code"]


def get_hint(challenge_id: str, hint_index: int) -> Dict[str, Any]:
    challenge = CHALLENGES.get(challenge_id)
    if not challenge:
        raise ValueError("Challenge not found")

    hints = challenge["hints"]
    safe_index = max(0, min(hint_index, len(hints) - 1))

    return {
        "challenge_id": challenge_id,
        "hint_index": safe_index,
        "hint": hints[safe_index],
    }


def _load_function_from_code(code: str, function_name: str) -> FunctionType:
    namespace: Dict[str, Any] = {}
    exec(code, {"__builtins__": SAFE_BUILTINS}, namespace)

    fn = namespace.get(function_name)
    if not callable(fn):
        raise ValueError(f"Function '{function_name}' was not found in your code.")

    return fn


def run_challenge(challenge_id: str, code: str) -> Dict[str, Any]:
    challenge = CHALLENGES.get(challenge_id)
    if not challenge:
        raise ValueError("Challenge not found")

    function_name = challenge["function_name"]
    tests = challenge["tests"]

    try:
        fn = _load_function_from_code(code, function_name)
    except Exception as exc:
        return {
            "challenge_id": challenge_id,
            "tests_passed": 0,
            "total_tests": len(tests),
            "score": 0,
            "all_passed": False,
            "results": [
                {
                    "passed": False,
                    "input": None,
                    "expected": None,
                    "actual": None,
                    "error": f"Code execution error: {exc}",
                }
            ],
            "feedback": "Your code could not run. Fix the syntax or function definition first.",
        }

    results: List[Dict[str, Any]] = []
    passed_count = 0

    for test in tests:
        test_input = test["input"]
        expected = test["expected"]

        try:
            actual = fn(*test_input)
            passed = actual == expected
            if passed:
                passed_count += 1

            results.append(
                {
                    "passed": passed,
                    "input": test_input,
                    "expected": expected,
                    "actual": actual,
                    "error": None,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "passed": False,
                    "input": test_input,
                    "expected": expected,
                    "actual": None,
                    "error": str(exc),
                }
            )

    total_tests = len(tests)
    score = int((passed_count / total_tests) * 100) if total_tests else 0
    all_passed = passed_count == total_tests

    if all_passed:
        feedback = "Excellent work. All tests passed."
    elif passed_count == 0:
        feedback = "No tests passed yet. Use a hint and check the core logic."
    else:
        feedback = "Good progress. Some tests still fail, so review edge cases and return values."

    return {
        "challenge_id": challenge_id,
        "tests_passed": passed_count,
        "total_tests": total_tests,
        "score": score,
        "all_passed": all_passed,
        "results": results,
        "feedback": feedback,
    }