const { TodoistApi } = require("@doist/todoist-api-typescript");
const datesApi = require("./dates.api");

const _ = require("lodash");
const uuid = require(`uuid-by-string`);
const got = require("got");
require(`dotenv`).config();

const dayjs = require("dayjs");
// const isoWeek = require("dayjs/plugin/isoWeek");
// const advancedFormat = require("dayjs/plugin/advancedFormat");
// const isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(require("dayjs/plugin/isoWeek"));
dayjs.extend(require("dayjs/plugin/advancedFormat"));
dayjs.extend(require("dayjs/plugin/isBetween"));
dayjs.extend(require("dayjs/plugin/utc"));
dayjs.extend(require("dayjs/plugin/timezone"));

const itemSchema = require(`../schema/schema.items.json`);
const completedItemSchema = require(`../schema/schema.completed_items.json`);
const projectSchema = require(`../schema/schema.projects.json`);
const labelSchema = require(`../schema/schema.labels.json`);
const userSchema = require(`../schema/schema.users.json`);
const dateSchema = require(`../schema/schema.dates.json`);
const weekSchema = require(`../schema/schema.weeks.json`);
const monthSchema = require(`../schema/schema.months.json`);
const weekDayNameSchema = require(`../schema/schema.weekdayname.json`);
const schemas = {
  item: itemSchema,
  completed_item: completedItemSchema,
  project: projectSchema,
  label: labelSchema,
  user: userSchema,
  date: dateSchema,
  week: weekSchema,
  month: monthSchema,
  weekdayname: weekDayNameSchema,
};

// const getTodoistClient = (account) =>
//   new TodoistApi(account.access_token || `INVALID TOKEN`);

const getFromSyncApi = async ({
  account,
  resourceTypes = ["all"],
  sync_token = "*",
}) => {
  const res = await got
    .post(`https://api.todoist.com/sync/v9/sync`, {
      resolveBodyOnly: true,
      headers: { Authorization: `Bearer ${account.access_token}` },
      json: {
        sync_token,
        resource_types: JSON.stringify(resourceTypes),
      },
    })
    .json();

  return res;
};

module.exports.getUser = async (account) => {
  const { user } = await getFromSyncApi({ account, resourceTypes: ["user"] });
  return user;
}
const getSingleResourceFromSyncApi = async ({
  account,
  resourceType,
  previousSyncToken,
}) => {
  const resourceTypes = [resourceType];
  const { sync_token, full_sync, ...res } = await getFromSyncApi({
    account,
    resourceTypes,
    previousSyncToken,
  });
  return { data: res[resourceType], sync_token, full_sync };
};

const getCompletedItemsSyncApi = async ({ account, limit = 100 }) => {
  const res = await got(`https://api.todoist.com/sync/v9/completed/get_all`, {
    headers: { Authorization: `Bearer ${account.access_token}` },
    searchParams: {
      limit,
    },
  }).json();
  return { data: res.items, sync_token: null, full_sync: null };
};

const getUsersSyncApi = async ({ account }) => {
  const { user, collaborators } = await getFromSyncApi({
    account,
    resourceTypes: ["collaborators", "user"],
  });
  const userTz = user.tz_info.timezone;
  const pickedUser = {
    ..._.pick(user, ["id", "email", "full_name", "image_id"]),
    timezone: userTz,
  };
  const users = _.uniqBy([...collaborators, pickedUser], "id");
  return { data: users, sync_token: null, full_sync: null };
};

module.exports.validate = async (account) => {
  const res = await getSingleResourceFromSyncApi({
    account,
    resourceType: "user",
  });
  if (res.data) {
    return { name: res.data.full_name };
  } else {
    res.status(401).json({ message: `Unauthorized` });
  }
};

const getTypes = () => {
  return [
    { id: "project", name: "TD Project" },
    { id: "item", name: "TD Item" },
    { id: "completed_item", name: "TD Completed Item" },
    { id: "label", name: "TD Label" },
    { id: "user", name: "TD User" },
    { id: "date", name: "TD Date" },
    { id: "week", name: "TD Week" },
    { id: "month", name: "TD Month" },
    { id: "weekdayname", name: "TD Week Day Name" },
  ];
};

module.exports.config = async ({ account, pageSize }) => {
  console.log("config: account: ", account);
  const types = getTypes();
  const filters = [
    {
      id: "timezone",
      title: "Select Timezone",
      datalist: true,
      optional: false,
      type: "list",
    },
    {
      id: "from",
      type: "date",
      title: "Start Absolute Date",
      optional: true,
    },
    {
      id: "monthrange",
      type: "number",
      title: "Months to Sync before and after (by default 3 months)",
      optional: true,
    },
  ];
  // return { types, filters, webhooks: { enabled: true } };
  return { types, filters };
};

const cloneDeepSchema = (schema) => _.cloneDeep(schema);

// const cleanRelationsDuplication = (schema) => {
//   _.keys(schema).forEach((id) => {
//     const typeSchema = schema[id];
//     _.keys(typeSchema).forEach((schemaFieldId) => {
//       const field = typeSchema[schemaFieldId];
//       if (!field) {
//         return;
//       }
//       if (!field.relation) {
//         return;
//       }
//       const { targetType, name, targetName } = field.relation;
//       const targetSchemaDatabase = schema[targetType];
//       if (_.isEmpty(targetSchemaDatabase)) {
//         delete typeSchema[schemaFieldId];
//         return;
//       }
//       const relationDuplicationId = _(targetSchemaDatabase)
//         .keys()
//         .find((fieldId) => {
//           const targetField = targetSchemaDatabase[fieldId];
//           if (!targetField.relation) {
//             return false;
//           }
//           if (targetField.relation.targetType !== id) {
//             return false;
//           }
//           return (
//             targetField.relation.name === targetName &&
//             targetField.relation.targetName === name
//           );
//         });
//       if (relationDuplicationId) {
//         if (id !== targetType && relationDuplicationId !== schemaFieldId) {
//           delete targetSchemaDatabase[relationDuplicationId];
//         }
//       }
//     });
//   });
// };

module.exports.schema = async ({ account, types }) => {
  // console.log("schema: account: ", account);
  console.log("schema: types: ", types);
  const schema = {};
  types.forEach((id) => {
    schema[id] = cloneDeepSchema(schemas[id]);
  });
  // console.log("schema: ", schema);
  return schema;
};

const getValue = (row, { path, arrayPath, subPath = `` }) => {
  let v = null;
  if (path === "date") {
  }

  const paths = _.isArray(path) ? path : [path];
  paths.forEach((p) => {
    if (!_.isUndefined(v) && !_.isNull(v)) {
      return;
    }
    v = _.get(row, p);
  });

  if (!_.isEmpty(subPath) && _.isObject(v)) {
    return getValue(v, { path: subPath });
  }

  if (!_.isEmpty(arrayPath) && _.isArray(v)) {
    return v.map((element) => getValue(element, { path: arrayPath }));
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

const processItem = ({ schema, item, requestedType, filter }) => {
  const r = {};
  const dates = datesApi.getDates({ filter: {}, requestedType: "date" });
  const weeks = datesApi.getDates({ filter: {}, requestedType: "week" });
  const months = datesApi.getDates({ filter: {}, requestedType: "month" });
  const weekdaynames = datesApi.getWeekDayNames();

  const timezone_from_filter = filter?.timezone ?? "Etc/UTC";
  console.log("timezone_from_filter: ", timezone_from_filter);

  _.keys(schema).forEach((id) => {
    const schemaValue = schema[id];

    // adjust date as UTC
    if(["due_date", "completed_at", "date_due_or_completed"].includes(id)){
      
      const value = getValue(item, schemaValue);
      r[id] = dayjs(value).utc().format();
    
    // set relations
    }else if (["date", "week", "month", "weekdayname"].includes(id)) {
      r[id] = datesApi.getDateRelation({
        requestedType: id,
        item,
        dates,
        weeks,
        months,
        weekdaynames,
      });
    
    // set urls
    } else if (id == "url") {
      if (requestedType == "item") {
        r[id] = `https://todoist.com/app/task/${item.id}`;
      } else if (requestedType == "completed_item") {
        r[id] = `https://todoist.com/app/task/${item.task_id}`;
      } else {
        r[id] = `https://todoist.com/app/${requestedType}/${item.id}`;
      }
    
    // set other fields
    } else {
      r[id] = getValue(item, schemaValue);
    }
  });
  return r;
};

const getData = async ({ account, filter, requestedType }) => {
  console.log("getData: account: ", account);
  switch (requestedType) {
    case "project":
      return await getSingleResourceFromSyncApi({
        account,
        resourceType: "projects",
      });
    case "item":
      return await getSingleResourceFromSyncApi({
        account,
        resourceType: "items",
      });
    case "label":
      return await getSingleResourceFromSyncApi({
        account,
        resourceType: "labels",
      });
    case "completed_item":
      return await getCompletedItemsSyncApi({ account });
    case "user":
      return await getUsersSyncApi({ account });

    default:
      return [];
  }
};

const getDateData = ({ account, filter, requestedType }) => {
  switch (requestedType) {
    case "date":
    case "week":
    case "month":
      return datesApi.getDates({ account, filter, requestedType });

    case "weekdayname":
      return datesApi.getWeekDayNames({ account, filter, requestedType });

    default:
      return [];
  }
};

module.exports.data = async ({ account, filter, requestedType }) => {
  console.log("filter: ", filter);
  console.log("requestedType: ", requestedType);

  switch (requestedType) {
    case "project":
    case "item":
    case "completed_item":
    case "label":
    case "user":
      const schema = schemas[requestedType];
      const { data, sync_token, full_sync } = await getData({
        account,
        filter,
        requestedType,
      });
      console.log("sync_token, full_sync: ", sync_token, full_sync);
      if (data.length > 0) {
        return {
          items: data.map((item) =>
          // items: data.slice(0,3).map((item) =>
            processItem({ schema, item, requestedType, filter })
          ),
        };
      } else {
        return { items: [] };
      }

    case "date":
    case "week":
    case "month":
    case "weekdayname":
      const dateData = getDateData({ account, filter, requestedType });
      return { items: dateData };
      // return { items: dateData.slice(0,3) };

    default:
      return { items: [] };
  }
};

const testAccount = () => {
  return { access_token: process.env.ENV_TEST_TOKEN };
};

const Fibery = require("fibery-unofficial");

module.exports.applyTodoistApiEndpoints = (app) => {
  console.log("applyTodoistApiEndpoints: ");
  // app.get("/api/get_projects", async (req, res) => {
  //   api.getProjects()
  //     .then((projects) => {
  //       console.log(projects);
  //       res.json(projects);
  //     })
  //     .catch((error) => console.log(error));
  // });

  // app.get("/api/get_collaborators", async (req, res) => {
  //   const account = testAccount();
  //   const user = await getFromSyncApi({ account, resourceTypes: ["user"] });
  //   console.log("account: ", account);
  //   console.log("user: ", user);
  //   const collaborators = await getCollaboratorsSyncApi({ account }).catch(
  //     (error) => console.log(error)
  //   );
  //   res.json(collaborators);
  // });
  app.get("/api/get_all_completed_items", async (req, res) => {
    const account = testAccount();
    const items = await getCompletedItemsSyncApi({ account });
    res.json(items);
  });
  // app.get("/api/get_items_with_completed", async (req, res) => {
  //   const account = testAccount();
  //   const items = await getItemsWithCompletedSyncApi({ account });
  //   res.json(items);
  // });
  app.get("/api/delete_webhook/:id", async (req, res) => {
    const account = testAccount();
    const webhook_id = req.params.id;
    const url = `https://ooooo.fibery.io/api/webhooks/v2/${webhook_id}`;
    const opt = {
      headers: {
        Authorization: `Bearer ${process.env.ENV_FIBERY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    };
    const response = await got.delete(url, opt).json();
    res.json(response);
  });

  app.get("/api/get_users", async (req, res) => {
    const account = testAccount();
    const users = await getUsersSyncApi({ account });
    console.log("users: ", users);
    res.json(users);
  });

  app.get("/api/get_schema", async (req, res) => {
    // const account = testAccount();
    // console.log("account: ", account);
    // const collaborators = await getCollaboratorsSyncApi({account}).catch((error) => console.log(error));
    const ps = getProjectSchema();
    console.log(typeof ps);
    res.json(ps);
  });

  // app.get("/api/create_view", async (req, res) => {
  //   const options =  {
  //     headers: {
  //       "Authorization": `Bearer ${process.env.ENV_FIBERY_API_TOKEN}`,
  //       "Content-Type": "application/json"
  //     },
  //     json: {
  //       "jsonrpc": "2.0",
  //       "method": "create-views",
  //       "params": {
  //         "views": [
  //           {
  //             "fibery/id": "3541bdf6-ab15-4d5e-b17b-eb124b8fe2f7",
  //             "fibery/name": "My Board",
  //             "fibery/type": "board",
  //             "fibery/meta": {},
  //             "fibery/container-app": {
  //               "fibery/id": "760ee2e2-e8ca-4f92-aaf2-4cde7f9dad0e"
  //             }
  //           }
  //         ]
  //       }
  //     },
  //   }
  //   const response = await got.post(`https://ooooo.fibery.io/api/views/json-rpc`, options).json()
  //   res.json({response});
  // });

  app.get("/api/get_entity", async (req, res) => {
    const fibery = new Fibery({
      host: "ooooo.fibery.io",
      token: process.env.ENV_FIBERY_API_TOKEN,
    });
    const systems = await fibery.entity.query(
      {
        "q/from": "System/System",
        "q/select": [
          "fibery/id",
          "fibery/public-id",
          "System/Name",
          "System/Latest Completed Child Datetime",
        ],
        "q/where": [
          ">=",
          ["System/Latest Completed Child Datetime"],
          "$birthday",
        ],
        "q/order-by": [[["System/Latest Completed Child Datetime"], "q/asc"]],
        "q/limit": 3,
      },
      { $birthday: "1986-01-01" }
    );

    // const options =  {
    //   headers: {
    //     "Authorization": `Bearer ${process.env.ENV_FIBERY_API_TOKEN}`,
    //     "Content-Type": "application/json"
    //   },
    //   json: [
    //     {
    //       "command": "fibery.entity/query",
    //       "args": {
    //         "query": {
    //           "q/from": "System/System",
    //           "q/select": [
    //              "fibery/id",
    //              "fibery/public-id",
    //              "System/name",
    //              "System/Full Name",
    //            ],
    //           "q/order-by": [
    //             [["System/Latest Completed Child Datetime"], "q/desc"]
    //           ],
    //           "q/limit": 3
    //         }
    //       }
    //     }
    //   ]
    // }
    // const response = await got.post(`https://ooooo.fibery.io/api/views/json-rpc`, options).json()
    res.json({ systems });
  });
};
