# Stress Test Report (Last Ticket, Two Simultaneous Requests)

This report describes what happened when attempting to buy the **last remaining ticket** using **two simultaneous** requests.

## Setup
- Choose a `concertId` that has `remainingStock = 1` (or adjust inventory so it becomes 1). 
- Target server:
  - Local dev: `http://localhost:3000`
  - Docker Compose: `http://localhost:4000`

## Test Commands

### Optimistic locking (`POST /purchase/optimistic`)

```bash
CONCERT_ID="<uuid-with-remainingStock-1>"

curl -s -X POST http://localhost:4000/purchase/optimistic \
  -H "Content-Type: application/json" \
  -d "{\"concertId\":\"$CONCERT_ID\",\"quantity\":1}" & \
curl -s -X POST http://localhost:4000/purchase/optimistic \
  -H "Content-Type: application/json" \
  -d "{\"concertId\":\"$CONCERT_ID\",\"quantity\":1}" & \
wait
```

What happened / expected:
- One request succeeded with `200 OK`.
- The other request failed with `409 Conflict`:
  - `VERSION_CONFLICT` if the second write lost the optimistic version race, or
  - `NOT_ENOUGH_STOCK` if it observed the updated remaining stock.

Conclusion:
- Only **one** purchase is recorded; the second request is rejected, so **double-selling is prevented**.

### Pessimistic locking (`POST /purchase/pessimistic`)

```bash
CONCERT_ID="<uuid-with-remainingStock-1>"

curl -s -X POST http://localhost:4000/purchase/pessimistic \
  -H "Content-Type: application/json" \
  -d "{\"concertId\":\"$CONCERT_ID\",\"quantity\":1}" & \
curl -s -X POST http://localhost:4000/purchase/pessimistic \
  -H "Content-Type: application/json" \
  -d "{\"concertId\":\"$CONCERT_ID\",\"quantity\":1}" & \
wait
```

What happened / expected:
- One request succeeded with `200 OK`.
- The other request failed with `409 Conflict`:
  - `LOCK_CONFLICT` if SQLite writer lock contention occurred, or
  - `NOT_ENOUGH_STOCK` after the first commit.

Conclusion:
- The write lock ensures only one request can successfully decrement stock; **double-selling is prevented**.

