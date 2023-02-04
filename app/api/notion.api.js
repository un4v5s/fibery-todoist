const _ = require(`lodash`);
const {Client, LogLevel} = require("@notionhq/client")
const defaultSchema = require(`./schema.default.json`);
const userSchema = require(`./schema.users.json`);

const getNotionClient = (account) => new Client({
    auth: account.key || account.access_token || `INVALID TOKEN`,
    logLevel: LogLevel.WARN,
});

module.exports.validate = async (account) => {
    const client = getNotionClient(account);
    const me = await client.users.me();
    return {name: me.name};
};

const TYPE_MAPPING = {
    date: {type: `date`},
    time: {type: `date`},
    title: {type: `text`, arrayPath: `plain_text`},
    rich_text: {type: `text`, arrayPath: `plain_text`, subType: `md`},
    relation: {
        type: `text`,
        arrayPath: `id`,
        relation: {
            cardinality: `many-to-many`,
            targetFieldId: `id`,
        },
    },
    created_by: {
        type: `text`,
        subPath: `id`,
        relation: {
            cardinality: `many-to-one`,
            targetType: `user`,
            targetFieldId: `id`,
        },
    },
    last_edited_by: {
        type: `text`,
        subPath: `id`,
        relation: {
            cardinality: `many-to-one`,
            targetType: `user`,
            targetFieldId: `id`,
        },
    },
    number: {type: `number`},
    phone_number: {type: `text`},
    multi_select: {type: `array[text]`, arrayPath: `name`},
    select: {type: `text`, subPath: `name`},
    people: {
        type: `array[text]`,
        arrayPath: `id`,
        relation: {
            cardinality: `many-to-many`,
            targetType: `user`,
            targetFieldId: `id`,
        },
    },
    checkbox: {type: `text`, subType: `boolean`},
    email: {type: `text`, subType: `email`},
    url: {type: `text`, subType: `url`},
    files: {type: `array[text]`, subType: `file`, arrayPath: `file.url`},
};

const getFieldAttributes = ({type}) => {
    let notionType = _.find(_.keys(TYPE_MAPPING), (t) => t === type);
    if (!notionType) {
        notionType = _.find(_.keys(TYPE_MAPPING), (t) => type.indexOf(t) >= 0);
    }
    return _.isEmpty(notionType) ? {type: `text`} : _.cloneDeep(TYPE_MAPPING[notionType]);
};

const getSchemaField = ({property, key, databaseName}) => {
    const {name, type} = property;
    const fieldAttributes = getFieldAttributes({type});
    const value = {name, path: `properties.${key}.${type}`};
    _.extend(value, fieldAttributes);
    if (value.relation) {
        value.relation.name = value.name;
        value.name = `${value.name} Ref`;
        value.relation.targetName = `${databaseName} (${value.name})`;
        if (_.isEmpty(value.relation.targetType)) {
            value.relation.targetType = property.relation.database_id;
            value.relation.targetName = property.relation.synced_property_name;
        }
    }
    return value;
};

const getDefaultSchema = () => _.cloneDeep(defaultSchema);
const getDefaultNameField = () => ({name: `Name`, type: `text`, path: `id`});

const createSchemaFromDatabase = (db) => {
    const databaseSchema = getDefaultSchema();
    const databaseName = getDatabaseItem(db).name;
    const title = {};
    _.keys(db.properties).forEach((key) => {
        const property = db.properties[key];
        if (_.isEmpty(title) && property.type === `title`) {
            _.extend(title, {key, property});
        }
        if (property.type === `rollup`) {
            return;
        }
        databaseSchema[key.toLowerCase()] = getSchemaField({property, key, databaseName});
    });
    if (_.isEmpty(databaseSchema.name)) {
        if (!_.isEmpty(title)) {
            databaseSchema.name = getSchemaField({property: title.property, key: title.key, databaseName});
            databaseSchema.name.name = `Name`;
        } else {
            databaseSchema.name = getDefaultNameField();
        }
    }
    return databaseSchema;
};

const cleanRelationsDuplication = (schema) => {
    _.keys(schema).forEach((id) => {
        const typeSchema = schema[id];
        _.keys(typeSchema).forEach((schemaFieldId) => {
            const field = typeSchema[schemaFieldId];
            if (!field) {
                return;
            }
            if (!field.relation) {
                return;
            }
            const {targetType, name, targetName} = field.relation;
            const targetSchemaDatabase = schema[targetType];
            if (_.isEmpty(targetSchemaDatabase)) {
                delete typeSchema[schemaFieldId];
                return;
            }
            const relationDuplicationId = _(targetSchemaDatabase).keys().find((fieldId) => {
                const targetField = targetSchemaDatabase[fieldId];
                if (!targetField.relation) {
                    return false;
                }
                if (targetField.relation.targetType !== id) {
                    return false;
                }
                return targetField.relation.name === targetName && targetField.relation.targetName === name;
            });
            if (relationDuplicationId) {
                if (id !== targetType && relationDuplicationId !== schemaFieldId) {
                    delete targetSchemaDatabase[relationDuplicationId];
                }
            }
        });
    });
};

module.exports.schema = async ({account, types}) => {
    const databases = await getDatabases({account});
    const mapDatabasesById = _.keyBy(databases, `id`);
    const schema = {};
    types.forEach((id) => {
        if (id === `user`) {
            schema.user = userSchema;
            return;
        }
        const db = mapDatabasesById[id];
        if (_.isEmpty(db)) {
            throw new Error(`Database with id "${id}" is not found`);
        }
        schema[id] = createSchemaFromDatabase(db);
    });
    cleanRelationsDuplication(schema);
    return schema;
};

const getDatabases = async ({account, pageSize = 1000}) => {
    const client = getNotionClient(account);
    let hasNext = true;
    let start_cursor = null;
    const databases = [];
    while (hasNext) {
        const args = {
            page_size: pageSize, filter: {
                value: `database`, property: `object`,
            }
        };
        if (start_cursor) {
            args.start_cursor = start_cursor;
        }
        const {results, has_more, next_cursor} = await client.search(args);
        results.forEach((db) => databases.push(db));
        hasNext = has_more;
        start_cursor = next_cursor;
    }
    return databases;
};

const getDatabaseItem = (db) => {
    const name = _.get(db, `title[0].plain_text`, `Noname`).replace(/[^\w ]+/g, ``).trim();
    return {id: db.id, name};
};

module.exports.config = async ({account, pageSize}) => {
    const databases = await getDatabases({account, pageSize});
    const dbItems = databases.map((db) => getDatabaseItem(db)).concat({id: `user`, name: `User`});
    return {types: dbItems, filters: []};
};

const getValue = (row, {path, arrayPath, subPath = ``}) => {
    let v = null;
    const paths = _.isArray(path) ? path : [path];
    paths.forEach((p) => {
        if (!_.isUndefined(v) && !_.isNull(v)) {
            return;
        }
        v = _.get(row, p);
    });

    if (!_.isEmpty(subPath) && _.isObject(v)) {
        return getValue(v, {path: subPath});
    }

    if (!_.isEmpty(arrayPath) && _.isArray(v)) {
        return v.map((element) => getValue(element, {path: arrayPath}));
    }

    if (_.isObject(v)) {
        if (v.start) {
            return v.start;
        }
        if (v.end) {
            return v.end;
        }
        if (v.type) {
            return v[v.type];
        }
        return JSON.stringify(v);
    }

    return v;
};

const processItem = ({schema, item}) => {
    const r = {};
    _.keys(schema).forEach((id) => {
        const schemaValue = schema[id];
        r[id] = getValue(item, schemaValue);
    });
    return r;
};

const resolveSchema = async ({pagination, client, requestedType}) => {
    if (pagination && pagination.schema) {
        return pagination.schema;
    }
    if (requestedType === `user`) {
        return userSchema;
    }
    return createSchemaFromDatabase(await client.databases.retrieve({database_id: requestedType}));
};

const createArgs = ({pageSize, pagination, requestedType}) => {
    const args = {
        page_size: pageSize,
    };
    if (!_.isEmpty(pagination) && !_.isEmpty(pagination.start_cursor)) {
        args.start_cursor = pagination.start_cursor;
    }
    if (requestedType !== `user`) {
        args.database_id = requestedType;
    }
    return args;
};

module.exports.data = async ({account, requestedType, pageSize = 1000, pagination}) => {
    const client = getNotionClient(account);
    const schema = await resolveSchema({pagination, client, requestedType});
    const args = createArgs({pageSize, pagination, requestedType});
    const data = requestedType !== `user`
        ? await client.databases.query(args)
        : await client.users.list(args);
    const {results, next_cursor, has_more} = data;
    return {
        items: results.map((item) => processItem({account, schema, item})),
        "pagination": {
            "hasNext": has_more,
            "nextPageConfig": {
                start_cursor: next_cursor,
                schema: has_more ? schema : null,
            },
        },
    };
};
