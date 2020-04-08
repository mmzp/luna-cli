#! /usr/bin/env node

const fs = require('fs');
const modelParser = require('./lib/model_parser');
const { scanDir } = require('./lib/utils');
const ejs = require('ejs');
const path = require('path');
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

const template =
`import { table, primaryKey, Model, FindOptions } from '@deluna/luna';
<% if (tableComment) { %>
// <%= tableComment %><% } %>
@table('<%= tableName %>')
export class <%= modelName %> extends Model {
    <% for(const column of columns) { %><% if (column.isPK) { %>@primaryKey<% } %>
    <%= column.name %>: <%= column.type %> = <%- column.initValue %>;<% } %>

    static async findOne(id: number | string): Promise<<%= modelName %> | undefined>;
    static async findOne(options: FindOptions): Promise<<%= modelName %> | undefined>;
    static async findOne(p1: any) {
        return Model._findOne(<%= modelName %>, p1);
    }
    static async findAll(idArr: Array<number | string>): Promise<<%= modelName %>[]>;
    static async findAll(options: FindOptions): Promise<<%= modelName %>[]>;
    static async findAll(p1: any) {
        return Model._findAll(<%= modelName %>, p1);
    }
    static async fetch(sql: string, params?: any[]): Promise<<%= modelName %> | undefined> {
        return Model._fetch(<%= modelName %>, sql, params);
    }
    static async fetchAll(sql: string, params?: any[]): Promise<<%= modelName %>[]> {
        return Model._fetchAll(<%= modelName %>, sql, params);
    }
    static async insert(info: <%= modelName %>): Promise<<%= modelName %>> {
        return Model._insert(info);
    }
    static async update(id: number | string, info: object): Promise<number>;
    static async update(options: FindOptions, info: object): Promise<number>;
    static async update(p1: any, info: object): Promise<number> {
        return Model._update(<%= modelName %>, p1, info);
    }
    static async delete(id: number | string): Promise<number>;
    static async delete(options: FindOptions): Promise<number>;
    static async delete(p1: any): Promise<number> {
        return Model._delete(<%= modelName %>, p1);
    }
    static async exec(sql: string, params?: any[]): Promise<number> {
        return Model._exec(sql, params);
    }
}
`;

(async () => {
    const oldFiles = await scanDir(modelPath);
    for (const filename of oldFiles) {
        if (filename.slice(-7) === '.gen.ts') {
            fs.unlinkSync(modelPath + '/' + filename);
        }
    }

    const sqlContent = fs.readFileSync(sqlFile).toString('utf8');
    const sqlContentArr = sqlContent.split('\n\n');
    const modelSchemeArr = [];
    let exportIndexContent = '';
    let modelCount = 0;
    for (let content of sqlContentArr) {
        if (content.slice(0, 12).toUpperCase() === 'CREATE TABLE') {
            const models = await modelParser.parse(content, modelPath);
            modelSchemeArr.push(...models);
        }
    }
    for (const modelScheme of modelSchemeArr) {
        const context = await ejs.render(template, {
            tableName: modelScheme.tableName,
            modelName: modelScheme.modelName,
            columns: modelScheme.columns,
            tableComment: modelScheme.tableComment,
        });
        const filename = modelScheme.filename + '.gen.ts';
        fs.writeFileSync(path.resolve(modelPath, `${filename}`), context);
        exportIndexContent += `export { ${modelScheme.modelName} } from './${filename.slice(0, -3)}';\n`;
        modelCount++;
    }

    if (!exportIndexContent) {
        exportIndexContent = 'export {};\n';
    }
    fs.writeFileSync(modelPath + '/generated.ts', exportIndexContent);

    if (!fs.existsSync(modelPath + '/custom.ts')) {
        fs.writeFileSync(modelPath + '/custom.ts', 'export {};\n');
    }
    if (!fs.existsSync(modelPath + '/index.ts')) {
        const content = `export * from './generated';\nexport * from './custom';\n`;
        fs.writeFileSync(modelPath + '/index.ts', content);
    }

    console.log(`[ generate ] ${modelCount} 个 model 文件生成完毕`);
})();