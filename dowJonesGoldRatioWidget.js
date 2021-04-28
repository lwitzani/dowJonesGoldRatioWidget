// the only variable you need to adjust depending on if you use iCloud or not
const FILE_MANAGER_MODE = 'ICLOUD'; // LOCAL or ICLOUD



// do not change the remaining variables
const URL = `https://gs2.xpdaten.de/chart.aspx?symbol=DJI.DJ,XAUUSD.FX&ratio=1&days=5&width=300&height=290&name=Dow-Jones/Gold-Ratio`;
const IMAGE_FILE_NAME = 'djGoldRatioImage.png';
const STATE_FILE_NAME = 'djGoldRatioState.json';
const INITIAL_JSON_STATE = {
    'lastTimeDownloaded': undefined
};

let widget = await createWidget()
if (config.runsInWidget) {
    Script.setWidget(widget);
    Script.complete();
} else {
    widget.presentLarge();
}

async function createWidget() {
    // fileManagerMode must be LOCAL if you do not use iCloud drive
    let fm = FILE_MANAGER_MODE === 'LOCAL' ? FileManager.local() : FileManager.iCloud();
    let img = await getDownloadedImage(fm);

    let widget = new ListWidget();
    widget.backgroundColor = new Color("#Ffffff");
    let stack = widget.addStack();
    stack.size = new Size(330, 290);
    stack.addSpacer(8);
    stack.addImage(img);
    return widget;
}

async function getDownloadedImage(fm) {
    let json = await getPersistedObject(fm, getFilePath(STATE_FILE_NAME, fm));
    if (json === undefined) {
        json = INITIAL_JSON_STATE;
    }
    let imagePath = getFilePath(IMAGE_FILE_NAME, fm);
    if (!isTimeToDownloadAgain(json.lastTimeDownloaded) && fm.fileExists(imagePath)) {
        const fileDownloaded = await fm.isFileDownloaded(imagePath);
        if (!fileDownloaded) {
            await fm.downloadFileFromiCloud(imagePath);
        }
        return fm.readImage(imagePath);
    } else {
        // image did not exist -> download it and save it for next time the widget runs
        const req = new Request(URL);
        const image = await req.loadImage();
        fm.writeImage(imagePath, image);
        json.lastTimeDownloaded = new Date();
        await persistObject(fm, json, getFilePath(STATE_FILE_NAME, fm));
        return image;
    }
}

function isTimeToDownloadAgain(dateToCheck) {
    if (dateToCheck === undefined) return true;

    let dateInThePast = new Date(dateToCheck);
    let now = new Date();
    let timeBetweenDates = parseInt((now.getTime() - dateInThePast.getTime()) / 1000); // seconds
    return timeBetweenDates > 24 * 60 * 60; // image is downloaded once a day
}

function getFilePath(fileName, fm) {
    let dirPath = fm.joinPath(fm.documentsDirectory(), 'dowJonesGoldRatio');
    if (!fm.fileExists(dirPath)) {
        fm.createDirectory(dirPath);
    }
    return fm.joinPath(dirPath, fileName);
}

async function getPersistedObject(fm, path) {
    if (fm.fileExists(path)) {
        const fileDownloaded = await fm.isFileDownloaded(path);
        if (!fileDownloaded) {
            await fm.downloadFileFromiCloud(path);
        }
        let raw, persistedObject;
        try {
            raw = fm.readString(path);
            persistedObject = JSON.parse(raw);
        } catch (e) {
            // file corrupted -> remove it
            fm.remove(path);
        }
        return persistedObject;
    }
}

async function persistObject(fm, object, path) {
    let raw = JSON.stringify(object, null, 2);
    fm.writeString(path, raw);
}