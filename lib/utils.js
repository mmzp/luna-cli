const fs = require('fs')

function getJsType(fieldType) {
    let jsType;
    switch (fieldType) {
        case 'TINYINT':
        case 'SMALLINT':
        case 'MEDIUMINT':
        case 'INT':
        case 'BIGINT':
        case 'DECIMAL':
        case 'FLOAT':
        case 'DOUBLE':
        case 'YEAR':
            jsType = 'number';
            break;
        default:
            jsType = 'string';
            break;
    }
    return jsType;
}

async function scanDir(path, prefix = ''){
    const files = [];
    const dir = fs.opendirSync(path);
    for await (const dirent of dir) {
        if (dirent.isFile()) {
            if (prefix) {
                files.push(`${prefix}/${dirent.name}`);
            } else {
                files.push(dirent.name);
            }
        } else if (dirent.isDirectory()) {
            const subFiles = await scanDir(`${path}/${dirent.name}`, dirent.name);
            files.push(...subFiles);
        }
    }
    return files;
}

module.exports = {
    getJsType,
    scanDir,
};
