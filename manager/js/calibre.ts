import * as path from "path";
import * as yesql from "seduce";
import * as fs from "fs";
import { exec } from "child_process";
let sqlite3;
try {
    sqlite3 = require("sqlite3");
} catch(e) {
    console.error("sqlite3 NOT AVAILABLE");
    console.warn(e);
    // create a dummy object
    class DummyDatabase {
        each(..._) {
            console.error("sqlite3 not available");
        }
    }
    sqlite3 = { Database: DummyDatabase };
}

const $HOME = process.env[(process.platform === "win32") ? "USERPROFILE" : "HOME"];
const $CALIBRE_HOME = path.join($HOME, "Calibre Library");
const $CDB_FILEPATH = path.join($CALIBRE_HOME, "metadata.db");
const $CALIBRE_SQL_FILEPATH = path.join(
    __dirname, "../../sql",
    "calibre.sql",
);

type Timestamp = string;

export class CalibreBookData {
    id?: number;
    book?: number;
    format?: string;
    uncompressed_size?: number;
    name?: string;

    constructor(data) {
        for(const key of Object.keys(data)) {
            this[key] = data[key];
        }
    }
}

export class CalibreBook {
    id?: number;
    title?: string;
    sort?: string;
    
    timestamp?: Timestamp;
    pubdate?: Timestamp;
    series_index?: number;
    author_sort?: string;
    isbn?: string;
    lccn?: string;
    path?: string;
    flags?: number;
    
    uuid?: string;
    has_cover?: boolean;
    last_modified?: Timestamp;

    data?: CalibreBookData;

    parseTimestamp(ts: string) {
        return Date.parse(ts);
    }

    constructor(data) {
        for(const key of Object.keys(data)) {
            this[key] = data[key];
        }
        for(const tsKey in [
            "timestamp",
            "pubdate",
            "last_modified",
        ]) {
            if(this[tsKey]) {
                this[tsKey] = this.parseTimestamp(this[tsKey]);
            }
        }
    }
}

/**
 * EXAMPLE:
 * 
 * CalibreManager.openEpubByBookId(bookId)
 */
export namespace CalibreManager {
    var databaseFilepath: string = $CDB_FILEPATH;
    var database;
    const calibreSql = yesql($CALIBRE_SQL_FILEPATH);

    export function loadDatabase(filepath: string = null) {
        if(filepath) {
            databaseFilepath = filepath;
        }
        database = new sqlite3.Database(databaseFilepath);
    }

    export function openEpub(epubFilepath) {
        fs.statSync(epubFilepath);
        exec([
            "ebook-viewer",
            epubFilepath,
        ].join(" "));
    }
    
    export function openCalibreEpubInReader(calibreBook: CalibreBook) {
        const epubFilepath = path.join(
            $CALIBRE_HOME,
            calibreBook.path,
            (calibreBook.data.name + ".epub"));
        openEpub(epubFilepath);
    }
    
    export function openEpubByBookId(bookId: number) {
        if(!database) {
            loadDatabase();
        }
        let sql = calibreSql.getEpubPathInfoById(bookId);
        database.each(sql, (function(err, row) {
            if(err) {
                console.warn(err)
                return;
            }
            let book = new CalibreBook({
                path: row.path,
                data: { name: row.name },
            });
            openCalibreEpubInReader(book);
        }));
    }    
}
