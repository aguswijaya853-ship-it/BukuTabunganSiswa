# SakuSiswa Security Specification (Phase 0 TDD)

## 1. Data Invariants & Master Source of Truth

1. **Global Default Deny**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false`).
2. **Verified Identity Gate**: Every write operation across all collections requires a signed-in user with `request.auth.token.email_verified == true`. Self-assigned roles are impossible because `/admins/{adminId}` forbids all client writes (`allow write: if false`).
3. **Tenant & PII Isolation**: `SchoolProfile`, `Student` (which includes guardian name and phone PII), `Transaction`, and `JournalNote` records are strictly isolated to `ownerId == request.auth.uid` (or verified `isAdmin()`). Blanket `isSignedIn()` reads or lists are strictly prohibited. Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid` without `get()`/`exists()` calls.
4. **Initial Balance Invariant**: A `Student` document must be created with `balance == 0`, `totalDeposit == 0`, `totalWithdrawal == 0`, `transactionCount == 0`, and `status == 'active'`. Balances can only change via validated `UpdateBalance` mutations paired atomically with a `Transaction` document.
5. **Atomic Ledger Invariant (`getAfter`)**: Creating a `Transaction` in `/transactions/{transactionId}` requires:
   - The target `/students/{studentId}` exists, is owned by `request.auth.uid`, and has `status == 'active'`.
   - Mathematical conservation of funds:
     - For `deposit`: `amount > 0` and `balanceAfter == balanceBefore + amount`.
     - For `withdrawal`: `amount > 0`, `balanceBefore >= amount`, and `balanceAfter == balanceBefore - amount`.
   - Pre-state match: `get(/students/$(studentId)).data.balance == balanceBefore`.
   - Post-state atomic batch match (`getAfter`): `getAfter(/students/$(studentId)).data.balance == balanceAfter` and `getAfter(/students/$(studentId)).data.transactionCount == get(/students/$(studentId)).data.transactionCount + 1`.
6. **Immutable Financial History**: `Transaction` records cannot be deleted (`allow delete: if false`), and financial fields (`amount`, `type`, `balanceBefore`, `balanceAfter`, `studentId`, `transactionDate`, `monthKey`, `transactionCode`) are immutable after creation. Only `note`, `isPinnedNote`, and `updatedAt` may be modified via the `UpdateTransactionNote` action.
7. **Terminal State Locking**:
   - Once a `Student` reaches `status == 'archived'` (requires `balance == 0`), all further non-admin updates are rejected.
   - Once a `JournalNote` reaches `status == 'resolved'`, all further non-admin updates are rejected.
8. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on every create and update.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 — Identity Spoofing on Student Create**: Authenticated user `uid_attacker` creates `/students/stu_1` with `ownerId: "uid_victim"`. -> `PERMISSION_DENIED`
2. **Payload 2 — Unverified Email Spoof Attack**: User with `email: "aguswijaya853@gmail.com"` but `email_verified: false` attempts to create a student or read admin-protected records. -> `PERMISSION_DENIED`
3. **Payload 3 — Shadow Field Injection on Student Create**: Valid student payload plus unauthorized shadow key `"isVerified": true`. -> `PERMISSION_DENIED`
4. **Payload 4 — Unbacked Initial Balance Injection**: Creating `/students/stu_2` with `balance: 5000000` without a transaction. -> `PERMISSION_DENIED`
5. **Payload 5 — Orphaned / Unsynchronized Transaction Create**: Creating `/transactions/trx_1` without atomically updating `/students/stu_1` balance in the same batch (`getAfter` mismatch). -> `PERMISSION_DENIED`
6. **Payload 6 — Overdraft / Negative Balance Math Exploit**: Submitting a `withdrawal` transaction where `amount: 500000` exceeds `balanceBefore: 100000`. -> `PERMISSION_DENIED`
7. **Payload 7 — Financial History Tampering on Transaction Update**: Updating `amount` or `balanceAfter` on an existing `/transactions/trx_1` document. -> `PERMISSION_DENIED`
8. **Payload 8 — Value Poisoning on Whitelisted Update Key**: Updating `note` on `/transactions/trx_1` with a non-string integer (`note: 99999`) or oversized 2,000-character string. -> `PERMISSION_DENIED`
9. **Payload 9 — Cross-Tenant PII Blanket Read / List**: User `uid_attacker` attempts `getDoc` or unfiltered `getDocs(collection(db, 'students'))` targeting `uid_victim` student records containing `guardianPhone`. -> `PERMISSION_DENIED`
10. **Payload 10 — Terminal State Bypass on Archived Student**: Attempting to update `fullName` or `notes` on a student whose `status` is already `'archived'`. -> `PERMISSION_DENIED`
11. **Payload 11 — Client Timestamp Forgery**: Creating a `JournalNote` with a backdated client `Timestamp` instead of `serverTimestamp()` (`request.time`). -> `PERMISSION_DENIED`
12. **Payload 12 — Self-Assigned Admin Privilege Escalation**: User writes `/admins/{uid}` to grant themselves admin privileges, or deletes a student with non-zero balance (`balance > 0`). -> `PERMISSION_DENIED`
