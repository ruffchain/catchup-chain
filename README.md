# RFC Catchup program

## Change History
- 1.0.0 To catchup with ruffchain main line, and provide account, tx information via HTTP port ; add winston log rotate
- 1.0.2 Add getCandy interface, use sqlite3 to store related info
- 1.0.3 Test added
- 1.0.4 to add double link list instead of array
  

## dependency
- node.js  (version == 8.11)
- ES2017
- tsc, typescript compiler (version == 2.8.1)
- winston v2.4.2 , 去掉兼容性，想办法，新版本是v3.1.0

## install

```
// under directory, run
npm install

```

database file is under data/

## How to use?

### Commands

## Design consideration
Resolve, Reject in Promise can be used later in other scopes, which makes it a perfect vehicle for later execution.


## Test





