#! /usr/bin/env node

const fs = require('fs');
const modelGenerator = require('./lib/model_generator');
const { scanDir } = require('./lib/utils');
const argvs = require('yargs').argv;

const sqlFile = argvs.sql;
const modelPath = argvs.model;

if (!sqlFile) {
    console.log('请指定 --sql 参数，用于指定需要解析的 sql 文件路径');
    return;
}
if (!modelPath) {
    console.log('请指定 --model 参数，用于指定 model 文件的生成路径');
    return;
}

(async ()=>{
    const oldFiles = await scanDir(modelPath);
    for (const filename of oldFiles) {
        if (filename.slice(-7) === '.gen.ts') {
            fs.unlinkSync(modelPath + '/' + filename);
        }
    }

    const sqlContent = fs.readFileSync(sqlFile).toString('utf8');
    const sqlContentArr = sqlContent.split('\n\n');
    for (let content of sqlContentArr) {
        if (content.slice(0, 12).toUpperCase() === 'CREATE TABLE') {
            await modelGenerator.generate(content, modelPath);
        }
    }

    const files = await scanDir(modelPath);
    let exportIndexContent = '';
    let modelCount = 0;
    for (const filename of files) {
        if (filename.slice(-7) === '.gen.ts') {
            exportIndexContent += `export * from './${filename.slice(0, -3)}';\n`;
            modelCount++;
        }
    }
    fs.writeFileSync(modelPath + '/generated.ts', exportIndexContent);
    if (!fs.existsSync(modelPath + '/index.ts')) {
        const content = `export * from './generated';\nexport * from './custom';\n`;
        fs.writeFileSync(modelPath + '/index.ts', content);
    }

    console.log(`[ generate ] ${modelCount} 个 model 文件生成完毕`);
})();