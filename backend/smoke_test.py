import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_routes():
    # 1. Health checks
    print("Testing /health...")
    try:
        res = requests.get(f"{BASE_URL}/health")
        print(f"  Status: {res.status_code}, Body: {res.text}")
    except Exception as e:
        print(f"!!! Failed to connect to /health: {e}")
        return

    # 2. Get OpenAPI spec to find all routes
    print("\nFetching openapi.json to map routes...")
    res = requests.get(f"{BASE_URL}/openapi.json")
    if res.status_code != 200:
        print("Failed to get openapi.json")
        return
        
    openapi = res.json()
    paths = openapi.get("paths", {})
    
    print(f"\nFound {len(paths)} routes. Testing them...")
    
    errors = 0
    for path, methods in paths.items():
        if path == "/openapi.json" or path == "/docs" or path == "/redoc":
            continue
            
        for method in methods.keys():
            url = f"{BASE_URL}{path}"
            method = method.upper()
            
            # Skip routes with path parameters for simple smoke test
            if "{" in path:
                print(f"[SKIP] {method} {path} (requires path params)")
                continue
                
            print(f"-> {method} {path}")
            try:
                if method == "GET":
                    r = requests.get(url, timeout=5)
                elif method == "POST":
                    r = requests.post(url, json={}, timeout=5)
                elif method == "PUT":
                    r = requests.put(url, json={}, timeout=5)
                elif method == "DELETE":
                    r = requests.delete(url, timeout=5)
                else:
                    continue
                
                # We expect 200 for OK, 401 for unauthorized, 422 for validation error, 405 for method not allowed
                # We don't want 500s or timeouts.
                if r.status_code >= 500:
                    print(f"   [FAIL] Expected < 500, got {r.status_code}. Response: {r.text[:200]}")
                    errors += 1
                else:
                    print(f"   [OK] {r.status_code}")
                    
            except Exception as e:
                print(f"   [ERROR] Exception hitting {url}: {e}")
                errors += 1

    print(f"\nSmoke test complete. Errors: {errors}")

if __name__ == "__main__":
    test_routes()
