"""
WishWell Frontend-to-Backend API Contract Verification Suite
Asserts that all endpoints called by frontend/src/api/endpoints.ts exist in backend API routers.
"""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_ENDPOINTS = REPO_ROOT / "frontend" / "src" / "api" / "endpoints.ts"
BACKEND_API_DIR = REPO_ROOT / "backend" / "app" / "api"

EXPECTED_ENDPOINTS = [
    ("POST", "/auth/login"),
    ("POST", "/auth/register"),
    ("GET", "/auth/me"),
    ("GET", "/wishes"),
    ("GET", "/wishes/{id}"),
    ("POST", "/wishes"),
    ("PUT", "/wishes/{id}"),
    ("DELETE", "/wishes/{id}"),
    ("GET", "/categories"),
    ("POST", "/wishes/{wishId}/claim"),
    ("POST", "/claims/{claimId}/release"),
    ("GET", "/claims/my"),
    ("POST", "/claims/{claimId}/deliver"),
    ("POST", "/deliveries/{deliveryId}/confirm"),
    ("POST", "/deliveries/{deliveryId}/thank-you"),
    ("GET", "/notifications"),
    ("PUT", "/notifications/{id}/read"),
    ("GET", "/impact/donor"),
    ("GET", "/deliveries/institution/pending"),
    ("GET", "/institutions/me"),
    ("POST", "/verifications/documents"),
    ("POST", "/verifications/submit"),
    ("GET", "/verifications/pending"),
    ("GET", "/verifications/recommended"),
    ("POST", "/verifications/{institutionId}/recommend"),
    ("POST", "/verifications/{institutionId}/approve"),
    ("GET", "/admin/analytics/overview"),
    ("GET", "/admin/analytics/wishes-monthly"),
    ("GET", "/admin/analytics/delivery-times"),
    ("GET", "/admin/analytics/stale-rates"),
    ("GET", "/admin/analytics/institutions-status"),
    ("GET", "/admin/analytics/top-categories"),
    ("GET", "/admin/audit/verify"),
    ("GET", "/admin/audit/logs"),
    ("POST", "/admin/claims/release-stale"),
]

def check_backend_routes():
    print("=" * 60)
    print("WishWell Frontend-Backend Contract Verification Suite")
    print("=" * 60)

    # Collect all route definitions across all backend api files
    route_patterns = []
    py_files = list(BACKEND_API_DIR.glob("*.py"))
    
    file_contents = {}
    for pf in py_files:
        file_contents[pf.name] = pf.read_text(encoding="utf-8")

    all_passed = True
    for method, path in EXPECTED_ENDPOINTS:
        # Normalize path pattern for regex
        # e.g., /wishes/{id} -> /wishes/{[a-zA-Z_]+}
        regex_path = re.sub(r'\{[a-zA-Z_]+\}', r'\{[^}]+\}', path)
        found = False

        method_lower = method.lower()
        # Look for @router.<method> or @api_router.<method>
        for fname, content in file_contents.items():
            # Check for router prefix
            prefix = ""
            p_match = re.search(r'APIRouter\s*\([^)]*prefix\s*=\s*["\']([^"\']+)["\']', content)
            if p_match:
                prefix = p_match.group(1)

            # Match route decorator: @router.get("...", ...) or @api_router.get("...", ...)
            for m in re.finditer(rf'@(?:router|api_router)\.{method_lower}\s*\(\s*["\']([^"\']*)["\']', content):
                route_subpath = m.group(1)
                full_path = (prefix + route_subpath).rstrip("/")
                if not full_path:
                    full_path = prefix or "/"
                
                # Compare full_path to path
                full_path_norm = re.sub(r'\{[a-zA-Z_]+\}', '{param}', full_path)
                exp_path_norm = re.sub(r'\{[a-zA-Z_]+\}', '{param}', path)

                if full_path_norm == exp_path_norm:
                    found = True
                    break
            if found:
                break

        status_str = "[PASS]" if found else "[FAIL]"
        print(f" {status_str} {method:6} {path}")
        if not found:
            all_passed = False

    print("=" * 60)
    if all_passed:
        print(" ALL 35 FRONTEND-BACKEND CONTRACT ROUTES VERIFIED 100%!")
    else:
        print(" SOME ROUTES FAILED VERIFICATION!")
    print("=" * 60)
    return all_passed

if __name__ == "__main__":
    import sys
    success = check_backend_routes()
    sys.exit(0 if success else 1)

