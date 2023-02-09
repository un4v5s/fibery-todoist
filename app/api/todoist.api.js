const _ = require("lodash");
const { TodoistApi } = require("@doist/todoist-api-typescript");
const itemSchema = require(`../schema/schema.items.json`);
const projectSchema = require(`../schema/schema.projects.json`);
const labelSchema = require(`../schema/schema.labels.json`);
const userSchema = require(`../schema/schema.users.json`);
const uuid = require(`uuid-by-string`);
// const { getUser } = require("@notionhq/client/build/src/api-endpoints");
const got = require("got");
require(`dotenv`).config();

const getTodoistClient = (account) =>
  new TodoistApi(account.access_token || `INVALID TOKEN`);

const readSyncApi = async ({ account, resourceTypes = ["all"] }) => {
  const res = await got
    .post(`https://api.todoist.com/sync/v9/sync`, {
      resolveBodyOnly: true,
      headers: { Authorization: `Bearer ${account.access_token}` },
      json: {
        sync_token: "*",
        resource_types: JSON.stringify(resourceTypes),
      },
    })
    .json();
  return res;
};


const getCollaboratorsSyncApi = async ({ account }) => {
  const res = await readSyncApi({ account, resourceTypes: ["collaborators"] });
  return res.collaborators;
};

// collaborators keys
// "id": "2671362",
// "email": "you@example.com",
// "full_name": "Example User",
// "timezone": "GMT +3:00",
// "image_id": null
const getUsersSyncApi = async ({ account }) => {
  const {user, collaborators} = await readSyncApi({ account, resourceTypes: ["collaborators", "user"] });
  const userTz = user.tz_info.timezone
  const pickedUser ={..._.pick(user, ["id", "email", "full_name", "image_id"]), timezone: userTz}
  const users = _.uniqBy([...collaborators, pickedUser], "id");
  return users;
};
const getProjectsSyncApi = async ({ account }) => {
  const { projects } = await readSyncApi({
    account,
    resourceTypes: ["projects"],
  });
  return projects;
};
const getItemsSyncApi = async ({ account }) => {
  const { items } = await readSyncApi({
    account,
    resourceTypes: ["items"],
  });
  return items;
};
const getLabelsSyncApi = async ({ account }) => {
  const { labels } = await readSyncApi({
    account,
    resourceTypes: ["labels"],
  });
  return labels;
};

module.exports.validate = async (account) => {
  const res = await readSyncApi({ account, resourceTypes: ["user"] });
  if (res.user) {
    return { name: res.user.full_name };
  } else {
    res.status(401).json({ message: `Unauthorized` });
  }
};

// old validate
// module.exports.validate = async (account) => {
//   console.log("account: ", account);
//   const client = getTodoistClient(account);
//   const projects = await client
//     .getProjects()
//     .catch((error) => console.log(error));
//   console.log("projects: ", projects);
//   return { projects };
// };

const getProjects = async ({ client, account }) => {
  // const client = getTodoistClient(account);
  const projects = client.getProjects().catch((error) => console.log(error));
  return projects;
};

const getTasks = async ({ client, account }) => {
  // const client = getTodoistClient(account);
  const tasks = client.getTasks().catch((error) => console.log(error));
  return tasks;
};

const getLabels = async ({ client, account }) => {
  // const client = getTodoistClient(account);
  const labels = client.getLabels().catch((error) => console.log(error));
  return labels;
};

const getProjectTasks = async ({ client, account, projectId }) => {
  // const client = getTodoistClient(account);
  const tasks = await client
    .getTasks({ project_id: projectId })
    .catch((error) => console.log(error));
  return tasks;
};

module.exports.config = async ({ account, pageSize }) => {
  const types = [
    { id: "project", name: "Project" },
    { id: "item", name: "Item" },
    { id: "label", name: "Label" },
    { id: "user", name: "User" },
  ];
  const filters = [];
  return { types, filters };
};

const getProjectSchema = () => _.cloneDeep(projectSchema);
// const getTaskSchema = () => _.cloneDeep(taskSchema);
const getItemSchema = () => _.cloneDeep(itemSchema);
const getLabelSchema = () => _.cloneDeep(labelSchema);
const getUserSchema = () => _.cloneDeep(userSchema);

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
  console.log("types: ", types);
  const schema = {};
  types.forEach((id) => {
    switch (id) {
      case "project":
        schema.project = getProjectSchema();
        break;
      case "item":
        schema.item = getItemSchema();
        break;
      case "label":
        schema.label = getLabelSchema();
        break;
      case "user":
        schema.user = getUserSchema();
        break;
      default:
        break;
    }
  });
  console.log("schema: ", schema);
  return schema;
};

const getValue = (row, { path, arrayPath, subPath = `` }) => {
  let v = null;
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
  console.log("schema, item: ", schema, item);
  _.keys(schema).forEach((id) => {
    console.log("id: ", id);
    const schemaValue = schema[id];
    r[id] = getValue(item, schemaValue);
  });
  console.log("r: ", r);
  return r;
};

const resolveSchema = async ({ requestedType }) => {
  console.log("resolveSchema: requestedType: ", requestedType);
  switch (requestedType) {
    case "project":
      return projectSchema;
    case "item":
      return itemSchema;
    case "label":
      return labelSchema;
    case "user":
      return userSchema;
    default:
      break;
  }
};

const getData = async ({ account, requestedType }) => {
  switch (requestedType) {
    case "project":
      return await getProjectsSyncApi({ account });
    case "item":
      return await getItemsSyncApi({ account });
    case "label":
      return await getLabelsSyncApi({ account });
    case "user":
      return await getUsersSyncApi({ account });
    default:
      return [];
  }
};

// const addPathProperty = (schema) => {
//   const obj = {};
//   Object.keys(schema).map((k) => {
//     console.log("k: ", k);
//     if (!schema[k].hasOwnProperty("path")) {
//       obj[k] = { ...schema[k], path: k };
//     } else {
//       obj[k] = schema[k];
//     }
//   });
//   return obj
// };

module.exports.data = async ({ account, requestedType }) => {
  // const client = getTodoistClient(account);
  const schema = await resolveSchema({ requestedType });
  // schema = addPathProperty(schema);
  // console.log("schema: ", schema);
  const data = await getData({ account, requestedType });
  if (data.length > 0) {
    return {
      items: data.map((item) => processItem({ schema, item })),
    };
  } else {
    return {
      items: [],
    };
  }
};

const testAccount = () => {
  return { access_token: process.env.ENV_TEST_TOKEN };
};

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
  //   const user = await readSyncApi({ account, resourceTypes: ["user"] });
  //   console.log("account: ", account);
  //   console.log("user: ", user);
  //   const collaborators = await getCollaboratorsSyncApi({ account }).catch(
  //     (error) => console.log(error)
  //   );
  //   res.json(collaborators);
  // });
  app.get("/api/get_users", async (req, res) => {
    const account = testAccount();
    const users = await getUsersSyncApi({account});
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
