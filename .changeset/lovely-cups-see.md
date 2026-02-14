---
"@warkypublic/zustandsyncstore": major
---

Fixed issues with React Elements causing the store to update props many times
Implement better comparison with less overhead.
Added tests for props synchronization, render tracking, and persistence.
Added waitForSync and fallback options. Children won't render before sync if waitForSync is true
