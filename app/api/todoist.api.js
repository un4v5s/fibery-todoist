const _ = require('lodash');
// const got = require(`got`);
// const uuid = require(`uuid-by-string`);
// const defaultSchema = require(`./schema.default.json`);
// const { DateTime } = require("luxon"); // ! use dayjs
const { TodoistApi } = require("@doist/todoist-api-typescript");
require(`dotenv`).config();

// import _ from 'lodash';
// import got from 'got';
// import uuid from 'uuid-by-string';
// import { DateTime } from 'luxon';
// import defaultSchema from '../../schema.default.json'
// import { TodoistApi } from "@doist/todoist-api-typescript";
// import * as dotenv from 'dotenv';
// dotenv.config()

const getTodoistClient = (account) => new TodoistApi(
  account.access_token || `INVALID TOKEN`
);
// const api_key = process.env.TODOIST_API_KEY ?? "";
// const api = new TodoistApi(api_key);

module.exports.validate = async (account) => {
  console.log("account: ", account);
  const client = getTodoistClient(account);
  const projects = await client.getProjects().catch((error) => console.log(error));
  console.log("projects: ", projects);
  return { projects };
};

module.exports.applyTodoistApiEndpoints = (app) => {
  console.log("applyTodoistApiEndpoints: ");

  app.get("/api/get_projects", async (req, res) => {
    api.getProjects()
      .then((projects) => {
        console.log(projects);
        res.json(projects);
      })
      .catch((error) => console.log(error));
  });

  app.get("/api/get_labels", async (req, res) => {
    api.getLabels()
      .then((labels) => {
        console.log(labels);
        res.json(labels);
      })
      .catch((error) => console.log(error));
  });

  app.get("/api/get_tasks", async (req, res) => {
    api.getTasks({project_id: "660061215"})
    .then((tasks) => {
      console.log(tasks);
      res.json(tasks);
    })
    .catch((error) => console.log(error))
  })

  app.get("/api/get_all_project_collaborators", async (req, res) => {
    const projects = await api.getProjects().catch((error) => console.log(error));
    console.log("projects: ", projects.length);

    let collaborators = [];
    for(const project of projects){
      console.log("project.id: ", project.id);
      const projectCollaborators = await api.getProjectCollaborators(project.id).catch((error) => console.log(error))
      console.log("projectCollaborators: ", projectCollaborators);
      collaborators = _.unionBy(collaborators, projectCollaborators, "id");
    }    
    res.json(collaborators);
  })
}

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
