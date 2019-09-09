# RFC Catchup program

## Change History
- 1.0.0 To catchup with ruffchain main line, and provide account, tx information via HTTP port ; add winston log rotate
- 1.0.2 Add getCandy interface, use sqlite3 to store related info
- 1.0.3 Test added
- 1.0.4 to add double link list instead of array
- 1.0.5 to add precesion checking to user
- 1.0.6 add getBalances
- 1.1.0 new api updates
  

## dependency
- node.js  (version == 8.11)
- ES2017
- tsc, typescript compiler (version == 2.8.1)
- winston v2.4.2 , 去掉兼容性，想办法，新版本是v3.1.0
- sqlite3

## install

### Config files:

```

// config rpc server ip & port
// under ./config/server.json file

{
    "ip": "xx.xx.xx.xx",
    "port": 18089,
    "enableGetCandy": false,
    "localPort": 18080,
    "genesisFile": "./config/xxx/genesis.json"
}

// need the right genesisFile under ./config/ directory
{
    
}

```

### Steps:

```

// under directory, run
npm install

// compile
npm compile

// Need to clean old db for 1st time
npm run cleandb

// run
npm run start

// Or use pm2 to manage the app


```

database file is under data/

## How to use?

### Commands

## Design consideration
Resolve, Reject in Promise can be used later in other scopes, which makes it a perfect vehicle for later execution.

### backup every 

## Test





