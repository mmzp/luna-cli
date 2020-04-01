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

                    modelSchemeArr.push({
                        tableName,
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
