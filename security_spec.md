# Harmoniq Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **PII Isolation**: User emails live exclusively under `/users/{uid}/private/account` and are readable/writable only by `request.auth.uid == uid`. `/publicProfiles/{uid}` must never accept an `email` field.
2. **Discoverability Enforcement**: Only profiles with `isDiscoverable == true` (or the user's own profile) may be read or listed by other signed-in users.
3. **Friend Request Integrity**: A user can only create a friend request with `fromUid == request.auth.uid`, `toUid != request.auth.uid`, `status == 'pending'`, and a valid target profile existing at `/publicProfiles/{toUid}`. Only `toUid` may transition `status` from `pending` to `accepted` or `declined`. Terminal states (`accepted`, `declined`) cannot be mutated.
4. **Atomic Friendship Creation**: Accepting a friend request must atomically create `/friendships/{pairId}` in the same write batch (`existsAfter`), and `/friendships/{pairId}` creation requires `getAfter(/friendRequests/{pairId}).data.status == 'accepted'`.
5. **Conversation & Message Participant Isolation**: Conversations use deterministic IDs `uidA_uidB` (`uidA < uidB`). Only `uidA` or `uidB` can read/list/update a conversation or read/list/create messages under it. Messages enforce Master Gate validation against the parent conversation on creation and are immutable after creation.
6. **Temporal & Structural Integrity**: All `createdAt` / `updatedAt` timestamps must equal `request.time`. All string fields enforce explicit `.size()` bounds; all IDs match `^[a-zA-Z0-9_\-]+$`.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **PII Leak Attack**: User B calls `get(/users/userA/private/account)` -> DENIED (`uid != request.auth.uid`).
2. **Ghost Field / Shadow Update**: User A sends `{ ..., isAdmin: true }` to `/publicProfiles/userA` -> DENIED (`hasOnly` rejects unknown keys).
3. **PII Injection into Public Profile**: User A attempts to write `email: "a@b.com"` into `/publicProfiles/userA` -> DENIED (`hasOnly` excludes `email`).
4. **Profile Spoofing**: User B attempts to create `/publicProfiles/userA` with `uid: "userA"` -> DENIED (`uid == request.auth.uid`).
5. **Private Profile Scraping**: User B attempts `get(/publicProfiles/privateUser)` where `isDiscoverable == false` -> DENIED.
6. **Self Friend Request**: User A creates `/friendRequests/userA_userA` with `fromUid == toUid` -> DENIED.
7. **Sender Self-Accept**: User A creates pending request to User B, then User A attempts `update` setting `status: 'accepted'` -> DENIED (`existing().toUid == request.auth.uid`).
8. **Orphan Friendship Bypass**: User A creates `/friendships/userA_userB` directly without an accepted friend request -> DENIED (`exists` + `getAfter` check fails).
9. **Terminal State Re-Open**: User B attempts to update an `accepted` friend request back to `pending` -> DENIED (`existing().status == 'pending'`).
10. **Non-Participant Conversation Read**: User C attempts `get(/conversations/userA_userB)` or `list` on `/conversations/userA_userB/messages` -> DENIED.
11. **Message Sender Impersonation**: User A creates a message in `userA_userB` with `senderId: "userB"` -> DENIED (`incoming().senderId == request.auth.uid`).
12. **Denial-of-Wallet Oversized Payload / Backdated Timestamp**: User A writes a 5000-character message or client-forged `createdAt` timestamp -> DENIED (`text.size() <= 1000` and `createdAt == request.time`).
