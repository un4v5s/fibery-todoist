const { TodoistApi } = require("@doist/todoist-api-typescript");
const datesApi = require("./dates.api");

const _ = require("lodash");
const uuid = require(`uuid-by-string`);
const got = require("got");
require(`dotenv`).config();

const dayjs = require("dayjs");
const isoWeek = require("dayjs/plugin/isoWeek");
const advancedFormat = require("dayjs/plugin/advancedFormat");
const isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(isoWeek);
dayjs.extend(advancedFormat);
dayjs.extend(isBetween);

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

const processItem = ({ schema, item }) => {
  const r = {};
  const dates = datesApi.getDates({ filter: {}, requestedType: "date" });
  const weeks = datesApi.getDates({ filter: {}, requestedType: "week" });
  const months = datesApi.getDates({ filter: {}, requestedType: "month" });
  const weekdaynames = datesApi.getWeekDayNames();
  _.keys(schema).forEach((id) => {
    const schemaValue = schema[id];
    if (["date", "week", "month", "weekdayname"].includes(id)) {
      r[id] = datesApi.getDateRelationValue({
        requestedType: id,
        item,
        dates,
        weeks,
        months,
        weekdaynames,
      });
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
          items: data.map((item) => processItem({ schema, item })),
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

// module.exports.config = async ({account, pageSize}) => {
//     const projects = await getProjects({account});
//     const pjItems = projects.map((pj) => getProjectItem(pj)).concat({id: `user`, name: `User`});
//     const filters = []
//     return {types: pjItems, filters};
// };

// module.exports.config = async ({ account }) => {
//   const projects = await getProjects({ account });
//   const projectTasks = projects
//     .map((pj) => getProjectTasks(pj.id))
//     .concat({ id: `user`, name: `User` });
//   return { types: projectTasks, filters: [] };
// };

// module.exports.applyTodoistApiEndpoints = (app) => {
//   console.log("applyTodoistApiEndpoints: ");

//   app.get("/api/get_projects", async (req, res) => {
//     api.getProjects()
//       .then((projects) => {
//         console.log(projects);
//         res.json(projects);
//       })
//       .catch((error) => console.log(error));
//   });

//   app.get("/api/get_labels", async (req, res) => {
//     api.getLabels()
//       .then((labels) => {
//         console.log(labels);
//         res.json(labels);
//       })
//       .catch((error) => console.log(error));
//   });

//   app.get("/api/get_tasks", async (req, res) => {
//     api.getTasks({project_id: "660061215"})
//     .then((tasks) => {
//       console.log(tasks);
//       res.json(tasks);
//     })
//     .catch((error) => console.log(error))
//   })

//   app.get("/api/get_all_project_collaborators", async (req, res) => {
//     const projects = await api.getProjects().catch((error) => console.log(error));
//     console.log("projects: ", projects.length);

//     let collaborators = [];
//     for(const project of projects){
//       console.log("project.id: ", project.id);
//       const projectCollaborators = await api.getProjectCollaborators(project.id).catch((error) => console.log(error))
//       console.log("projectCollaborators: ", projectCollaborators);
//       collaborators = _.unionBy(collaborators, projectCollaborators, "id");
//     }
//     res.json(collaborators);
//   })
// }

// scrapbox example
// module.exports.validate = async (sid) => {
//   if (_.isEmpty(sid)) {
//     return {"message": "connect.sid is required"}
//   }
//   const options = {
//     headers: {
//       'Cookie': `connect.sid=${sid}`
//     }
//   };
//   const res = await (got("https://scrapbox.io/api/users/me", options).json());
//   return res;
// };

// const getProjects = async ({account}) => {
//   const options = {
//     headers: {
//       'Cookie': `connect.sid=${account.sid}`
//     }
//   };
//   const res = await (got("https://scrapbox.io/api/projects", options).json());
//   return res.projects;
// };

// const getProjectItem = (pj) => {
//   return {id: pj.id, name: pj.name};
// };

// module.exports.config = async ({account, pageSize}) => {
//     const projects = await getProjects({account});
//     const pjItems = projects.map((pj) => getProjectItem(pj)).concat({id: `user`, name: `User`});
//     const filters = [
//       {
//         "id": "sort",
//         "title": "Sort Order (Updated for default)",
//         "datalist": true,
//         "optional": true,
//         "type": "list"
//       },
//       {
//         "type": "link",
//         "id": "link",
//         "name": "About sort order",
//         "value": "https://scrapbox.io/scrapboxlab/api%2Fpages%2F:projectname"
//       }
//     ]
//     return {types: pjItems, filters};
// };

// const getDefaultSchema = () => _.cloneDeep(defaultSchema);

// const createSchemaFromProject = (pj, id) => {
//   const projectSchema = getDefaultSchema();
//   _.keys(projectSchema).forEach((key) => {
//     if (key === 'relation') {
//       projectSchema[key.toLowerCase()] = {
//         "name": "Related Pages Ref",
//         "type": "array[text]",
//         "relation": {
//           "cardinality": "many-to-many",
//           "targetFieldId": "id",
//           "name": "Links Relation",
//           "targetName": pj.name,
//           "targetType": id
//           }
//       }
//     }
//   });
//   return projectSchema;
// };

// module.exports.schema = async ({account, types}) => {
//   const projects = await getProjects({account});
//   const mapProjectsById = _.keyBy(projects, `id`);
//   const schema = {};
//   types.forEach((id) => {
//     const pj = mapProjectsById[id];
//     if (_.isEmpty(pj)) {
//         throw new Error(`Project with id "${id}" is not found`);
//     }
//     schema[id] = createSchemaFromProject(pj, id);
//   });
//   return schema;
// };

// const getSearchTitles = async ({account, projectName}) => {
//   const options = {
//     headers: {
//       'Cookie': `connect.sid=${account.sid}`
//     }
//   };
//   const res = await (got(`https://scrapbox.io/api/pages/${projectName}/search/titles`, options).json());
//   return res;
// };

// const getPages = async ({account, projectName, args, filter}) => {
//   const {limit, skip} = args;
//   const {sort} = filter;
//   const options = {
//     headers: {
//       'Cookie': `connect.sid=${account.sid}`
//     }
//   };
//   const res = await (got(`https://scrapbox.io/api/pages/${projectName}?limit=${limit}&skip=${skip}&sort=${sort}`, options).json());
//   return res;
// };

// const createArgs = ({limit, pagination}) => {
//   const args = {
//     limit,
//     skip: 0
//   };
//   if (!_.isEmpty(pagination) && !_.isNull(pagination.skip)) {
//     args.skip = pagination.skip;
//   }
//   return args;
// };

// module.exports.getPages = async ({account, requestedType, filter, limit=1000, pagination}) => {
//   const args = createArgs({limit, pagination});

//   // Get projects from Scrapbox API
//   const projects = await getProjects({account});
//   const mapProjectsById = _.keyBy(projects, `id`);
//   const pj = mapProjectsById[requestedType];
//   const projectName = pj.name;

//   // Get searchTitles from Scrapbox API
//   const searchTitles = await getSearchTitles({account, projectName});

//   // Get pages from Scrapbox API
//   const {pages, skip, count} = await getPages({account, projectName, args, filter});

//   // Determine process paging
//   const hasNext = (skip + limit) < count;

//   // Object for merge links of searchTitles with pages
//   const title_id_obj = {};

//   // Start loop and format
//   let res = pages.map(e => {
//     let obj = _.pick(e, ['created', 'updated', 'linked', 'views']);
//     obj['id'] = uuid(JSON.stringify(obj));
//     obj['name'] = e.title;
//     obj['sb_id'] = e.id;
//     obj['url'] = encodeURI(`https://scrapbox.io/${projectName}/${e.title}`);
//     obj['descriptions'] = e.descriptions.map(e => e.replace(/\[\**/g,"").replace(/\]/g,"")).join("\n");
//     obj['updated'] = DateTime.fromSeconds(obj['updated']).toLocaleString(DateTime.DATETIME_SHORT);
//     obj['created'] = DateTime.fromSeconds(obj['created']).toLocaleString(DateTime.DATETIME_SHORT);
//     let searchTitlesObj = _.find(searchTitles, ['id', e.id]);
//     obj['links'] = searchTitlesObj ? searchTitlesObj.links : [];
//     obj['fullLinks'] = searchTitlesObj ? searchTitlesObj.links.map(e => encodeURI(`https://scrapbox.io/${projectName}/${e}`)) : [];

//     // For merging links later
//     title_id_obj[e.title] = obj['id'];
//     return obj;
//   });

//   // Merge links of searchTitles with pages
//   res = res.map(e => {
//     const relations = e.links.map(n => {
//       return title_id_obj[n];
//     })
//     return {...e, relation: relations.filter(e => e!=null)};
//   })

//   // return items with pagination object
//   return {
//     items: res,
//     pagination: {
//       "hasNext": hasNext,
//       "nextPageConfig": {
//         "skip": skip + limit
//       }
//     }
//   }
// };
