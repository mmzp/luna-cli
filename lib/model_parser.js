const sqlParser = require('@k-tavern/sql-parser');
const pluralize = require('pluralize');
const utils = require('./utils');

module.exports = {
    async parse(sqlContent) {
        const modelSchemeArr = [];
        let jsonScheme = sqlParser.parse(sqlContent);
        if (jsonScheme && jsonScheme.length) {
            for (let tableScheme of jsonScheme) {
                if (tableScheme.type === 'create_table') {
                    const tableName = tableScheme.name;
                    const filename = pluralize.singular(tableName);
                    const modelName = filename
                        .split('_')
                        .map(item => {
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
                    for (const column of tableScheme.columns) {
                        if (column.type === 'column') {
                            let type = utils.getJsType(column.data_type.type);
                            const name = column.name;
                            const allowNull = column.allow_null;
                            let initValue = '';
                            switch (type) {
                                case 'number':
                                    initValue = 0;
                                    break;
                                case 'boolean':
                                    initValue = false;
                                    break;
                                case 'string':
                                    default:
                                    initValue = `''`;
                                    break;
                            }
                            const defaultValue = column.default_value || null;
                            if (allowNull) {
                                type += ' | null';
                                if (defaultValue === null) {
                                    initValue = 'null';
                                }
                            }
                            columns.push({
                                type,
                                name,
                                allowNull,
                                initValue,
                                defaultValue,
                            });
                        } else if (column.type === 'primary_key') {
                            primaryKeys = column.fields;
                        }
                    }
                    if (primaryKeys.length) {
                        for (const i in columns) {
                            if (primaryKeys.includes(columns[i].name)) {
                                columns[i].isPK = true;
                            }
                        }
                    }

                    let tableComment = '';
                    if (tableScheme.options) {
                        for (const option of tableScheme.options) {
                            if (option.key === 'COMMENT') {
                                tableComment = option.value;
                            }
                        }
                    }

                    modelSchemeArr.push({
                        tableName,
                        filename,
                        modelName,
                        columns,
                        tableComment,
                    });
                }
            }
        }
        return modelSchemeArr;
    },
};
