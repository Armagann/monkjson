let Monk = require("monk");
let _ = {
    set: require("lodash/set"),
    get: require("lodash/get"),
    has: require("lodash/has"),
    unset: require("lodash/unset"),
    update: require("lodash/update")
}

/** @type {Monk.IMonkManager} */
let db;

/** @type {Monk.ICollection} */
let mjCollection;

let isConnectionClosed = true;

/**
 * @param {String} uri Connection uri
 * @param {String} collectionName The MonkJson's collection name. (Default: monkjson)
 */
function setConnection(uri, collectionName = "monkjson") {
    isConnectionClosed = false;
    db = Monk.default(uri);
    mjCollection = db.get(collectionName);
    mjCollection.createIndex("name");
    return { db, mjCollection };
}

/** Can be undefined
 * @returns {db: Monk.IMonkManager, mjCollection: Monk.ICollection}
 *  */
function getConnection() {
    return { db, mjCollection }
}

/** 
 * @throws "ERRCINO"
 */
function endConnection() {
    if (!db) throw "ERRCINO: Connection is not open.";
    isConnectionClosed = true;
    db.close();
}

/**
 * @param {String} name 
 * 
 * @throws "ERRCINS, ERRDSBS"
 */
function MonkJson(name) {

    if (!mjCollection || isConnectionClosed) throw "ERRCINS: Connection is not set.";
    if (typeof name != "string" && name) throw "ERRDSBS: Database name should be string.";
    this.name = name;

    async function getDBJson() {
        let mj = await mjCollection.findOne({ name }, { projection: { name: 1 } });
        console.log("GET", mj);
        if (!mj) {
            mj = await mjCollection.insert({ name, json: {} });
            console.log("GET CRT", mj)
        }
        return mj.json;
    }

    async function setDBJson(dataToSet) {
        let mj = await mjCollection.findOne({ name }, { projection: { name: 1 } });
        console.log("SET", mj);
        if (!mj) {
            mj = await mjCollection.insert({ name, json: {} });
            console.log("SET CRT", mj)
        }
        mj.json = dataToSet;
        await mjCollection.findOneAndUpdate({ name }, { $set: mj });
        return dataToSet;
    }

    this.system = { getDBJson, setDBJson, mjCollection, db };

    /**
     * @param {String} dataPath 
     * @param {*} dataValue
     */
    this.set = this.put = this.insert = async (dataPath, dataValue) => {
        let dbJson = await getDBJson();
        let newJson = _.set(dbJson, dataPath, dataValue);
        await setDBJson(newJson);
        return dataValue;
    }

    /**
     * @param {String} dataPath
     */
    this.get = async (dataPath) => {
        let dbJson = await getDBJson();
        let resultData = _.get(dbJson, dataPath);
        return resultData;
    }

    /**
     * @param {String} dataPath
     */
    this.has = this.exists = async (dataPath) => {
        let dbJson = await getDBJson();
        let resultData = _.has(dbJson, dataPath);
        return resultData;
    }

    /**
     * @param {String} dataPath
     */
    this.del = this.delete = this.unset = async (dataPath) => {
        let dbJson = await getDBJson();
        let isOk = _.unset(dbJson, dataPath); // this method mutates the original object
        await setDBJson(dbJson);
        return isOk;
    }

    /**
     * @param {String} dataPath
     * @param {*} values
     * 
     * @throws "ERRVATDINAA"
     */
    this.push = async (dataPath, ...values) => {
        let dbJson = await getDBJson();
        let oldVal = _.set()
        if (Array.isArray(oldVal)) {
            oldVal.push(...values);
            let resultData = _.set(dbJson, dataPath, oldVal);
            await setDBJson(resultData);
            return oldVal;
        } else {
            throw "ERRVATDINAA: Value at the dataPath is not a array."
        }
    }

    /**
    * @param {String} dataPath
    * @param {*} value
    */
    this.add = async (dataPath, value) => {
        let dbJson = await getDBJson();
        let oldVal = _.get(dbJson, dataPath);
        let newVal = oldVal + value;
        let resultData = _.set(dbJson, dataPath, newVal);
        await setDBJson(resultData);
        return newVal;
    }

    /**
     * @param {String} dataPath
     * @param {*} value
     */
    this.subtract = async (dataPath, value) => {
        let dbJson = await getDBJson();
        let oldVal = _.get(dbJson, dataPath);
        let newVal = oldVal - value;
        let resultData = _.set(dbJson, dataPath, newVal);
        await setDBJson(resultData);
        return newVal;
    }

    /**
     * @param {String} dataPath 
     * @param {(value: any) => any} updater 
     */
    this.update = async (dataPath, updater) => {
        let dbJson = await getDBJson();
        let newVal = _.update(dbJson, dataPath, updater);
        await setDBJson(dbJson);
        return newVal;
    }
}

module.exports = {
    MonkJson,
    setConnection,
    endConnection,
    getConnection
}