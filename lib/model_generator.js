const fs = require('fs');
const path = require('path');
const sqlParser = require('@k-tavern/sql-parser');
const pluralize = require('pluralize');
const ejs = require('ejs');
const utils = require('./utils');

const template = 
`
import { table, primaryKey } from '../luna';
import { Model, FindOptions } from '../db';

<% if (tableComment) { %>// <%= tableComment %><% } %>
@table('<%= tableName %>')
export class <%= modelName %> extends Model {
    <% for(const column of columns) { %><% if (column.isPK) { %>@primaryKey<% } %>
    <%= column.name %>?: <%= column.type %> = undefined;<% } %>

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
    static async update(id: number | string, info: <%= modelName %>): Promise<number>;
    static async update(options: FindOptions, info: <%= modelName %>): Promise<number>;
    static async update(p1: any, info: <%= modelName %>): Promise<number> {
        return Model._update(p1, info);
    }
    static async delete(id: number | string, info: <%= modelName %>): Promise<number>;
    static async delete(options: FindOptions, info: <%= modelName %>): Promise<number>;
    static async delete(p1: any, info: <%= modelName %>): Promise<number> {
        return Model._delete(p1, info);
    }
    static async exec(sql: string, params?: any[]): Promise<number> {
        return Model._exec(sql, params);
    }
}
`;

module.exports = {
    async generate(sqlContent, modelPath) {
        let jsonScheme = sqlParser.parse(sqlContent);
        if (jsonScheme && jsonScheme.length) {
            for (let tableScheme of jsonScheme) {
                if (tableScheme.type === 'create_table') {
                    const tableName = tableScheme.name;
                    const modelName = pluralize.singular(tableName)
                        .split('_')
                        .map(item=>{
                            item[0] = item[0].toUpperCase()
                            if (item.length === 1) {
                                item = item.toUpperCase();
                            } else {
                                item = item[0].toUpperCase() + item.slice(1);
                            }
                            return item;
                        })  
                        .join('') + 'Model';
                    const columns = [];
                    let primaryKeys = [];
                    for(const column of tableScheme.columns) {
                        if (column.type === 'column') {
                            const type = utils.getJsType(column.data_type.type);
                            const name = column.name;
                            columns.push({
                                type,
                                name,
                            });
                        } else if (column.type === 'primary_key') {
                            primaryKeys = column.fields;
                        }
                    }
                    if (primaryKeys.length) {
                        for(const i in columns) {
                            if (primaryKeys.includes(columns[i].name)) {
                                columns[i].isPK = true;
                            }
                        }
                    }

                    let tableComment = '';
                    if (tableScheme.options) {
                        for(const option of tableScheme.options) {
                            if (option.key === 'COMMENT') {
                                tableComment = option.value;
                            }
                        }
                    }

                    const context = await ejs.render(template, {
                        tableName,
                        modelName,
                        columns,
                        tableComment,
                    });
                    const filename = pluralize.singular(tableName) + '.gen.ts';
                    fs.writeFileSync(path.resolve(modelPath, `${filename}`), context);
                    // console.log(`model: ${modelName} ${filename}`);
                }
            }
        }
    },
};
