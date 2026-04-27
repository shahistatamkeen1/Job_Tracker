from __future__ import annotations

from types import FunctionType
from typing import Any, Dict, List


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
    "str": str,
    "int": int,
    "float": float,
    "bool": bool,
}


def _load_function_from_code(code: str, function_name: str) -> FunctionType:
    namespace: Dict[str, Any] = {}
    exec(code, {"__builtins__": SAFE_BUILTINS}, namespace)

    fn = namespace.get(function_name)

    if not callable(fn):
        raise ValueError(f"Function '{function_name}' was not found in your code.")

    return fn


def run_dynamic_challenge(challenge: dict, code: str) -> Dict[str, Any]:
    function_name = challenge.get("function_name")
    tests = challenge.get("tests", [])

    if not function_name:
        raise ValueError("Challenge is missing function_name.")

    if not tests:
        raise ValueError("Challenge has no tests.")

    try:
        fn = _load_function_from_code(code, function_name)
    except Exception as exc:
        return {
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
            "feedback": "Your code could not run. Fix the syntax or function name first.",
        }

    results: List[Dict[str, Any]] = []
    passed_count = 0

    for test in tests:
        test_input = test.get("input", [])
        expected = test.get("expected")

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
        feedback = "No tests passed yet. Use a hint and check the main logic."
    else:
        feedback = "Good progress. Some tests still fail, so review the remaining cases."

    return {
        "tests_passed": passed_count,
        "total_tests": total_tests,
        "score": score,
        "all_passed": all_passed,
        "results": results,
        "feedback": feedback,
    }