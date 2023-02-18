const { TodoistApi } = require("@doist/todoist-api-typescript");

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

const getTodoistClient = (account) =>
  new TodoistApi(account.access_token || `INVALID TOKEN`);

const getFromSyncApi = async ({ account, resourceTypes = ["all"], sync_token = "*" }) => {
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

const getSingleResourceFromSyncApi = async ({ account, resourceType, previousSyncToken }) => {
  const resourceTypes = [resourceType];
  const {sync_token, full_sync, ...res} = await getFromSyncApi({ account, resourceTypes, previousSyncToken });
  return {data: res[resourceType], sync_token, full_sync };
};

const getCompletedItemsSyncApi = async ({ account, limit = 100 }) => {
  const res = await got(`https://api.todoist.com/sync/v9/completed/get_all`, {
    headers: { Authorization: `Bearer ${account.access_token}` },
    searchParams: {
      limit,
      // annotate_notes: true,
    },
  }).json();
  return {data: res.items};
};

// const getCollaboratorsSyncApi = async ({ account }) => {
//   const res = await getFromSyncApi({
//     account,
//     resourceTypes: ["collaborators"],
//   });
//   return res.collaborators;
// };

// collaborators keys
// "id": "2671362",
// "email": "you@example.com",
// "full_name": "Example User",
// "timezone": "GMT +3:00",
// "image_id": null
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
  return {data:users};
};

// const getFromSyncApi = async ({ account, resourceTypes }) => {
//   return await getFromSyncApi({
//     account,
//     resourceTypes
//   });
// };

// const getProjectsSyncApi = async ({ account }) => {
//   const { projects } = await getFromSyncApi({
//     account,
//     resourceTypes: ["projects"],
//   });
//   return projects;
// };
// const getItemsSyncApi = async ({ account }) => {
//   const { items } = await getFromSyncApi({
//     account,
//     resourceTypes: ["items"],
//   });
//   return items;
// };
// const getItemsWithCompletedSyncApi = async ({ account }) => {
//   const items = await getItemsSyncApi({ account });
//   let { items: completedItems } = await getCompletedItemsSyncApi({ account });
//   return _.sortBy(
//     [...items, ...completedItems],
//     [
//       function (o) {
//         return o.added_at || o.completed_at;
//       },
//     ]
//   );
// };
// const getLabelsSyncApi = async ({ account }) => {
//   const { labels } = await getFromSyncApi({
//     account,
//     resourceTypes: ["labels"],
//   });
//   return labels;
// };

// sunsama view
const getYearRange = (filter) => {
  let fromYear = parseInt(filter.from);
  let toYear = parseInt(filter.to);

  if (_.isNaN(fromYear)) {
    fromYear = new Date().getFullYear() - 1;
  }
  if (_.isNaN(toYear)) {
    toYear = new Date().getFullYear();
  }
  const yearRange = [];
  while (fromYear <= toYear) {
    yearRange.push(fromYear);
    fromYear++;
  }
  return yearRange;
};

module.exports.validate = async (account) => {
  const res = await getSingleResourceFromSyncApi({ account, resourceType: "user" });
  if (res.data) {
    return { name: res.data.full_name };
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

// const getProjects = async ({ client, account }) => {
//   // const client = getTodoistClient(account);
//   const projects = client.getProjects().catch((error) => console.log(error));
//   return projects;
// };

// const getTasks = async ({ client, account }) => {
//   // const client = getTodoistClient(account);
//   const tasks = client.getTasks().catch((error) => console.log(error));
//   return tasks;
// };

// const getLabels = async ({ client, account }) => {
//   // const client = getTodoistClient(account);
//   const labels = client.getLabels().catch((error) => console.log(error));
//   return labels;
// };

// const getProjectTasks = async ({ client, account, projectId }) => {
//   // const client = getTodoistClient(account);
//   const tasks = await client
//     .getTasks({ project_id: projectId })
//     .catch((error) => console.log(error));
//   return tasks;
// };

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
    // {
    //   id: "timezones",
    //   title: "Timezones",
    //   datalist: true,
    //   optional: true,
    //   type: "list",
    // },
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
  // const webhooks = { enabled: true };
  // return { types, filters, webhooks };
  return { types, filters };
};

const getProjectSchema = () => _.cloneDeep(projectSchema);
// const getTaskSchema = () => _.cloneDeep(taskSchema);
const getItemSchema = () => _.cloneDeep(itemSchema);
const getCompletedItemSchema = () => _.cloneDeep(completedItemSchema);
const getLabelSchema = () => _.cloneDeep(labelSchema);
const getUserSchema = () => _.cloneDeep(userSchema);
const getDateSchema = () => _.cloneDeep(dateSchema);
const getWeekSchema = () => _.cloneDeep(weekSchema);
const getMonthSchema = () => _.cloneDeep(monthSchema);
const getWeekDayNameSchema = () => _.cloneDeep(weekDayNameSchema);

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
    switch (id) {
      case "project":
        schema.project = getProjectSchema();
        break;
      case "item":
        schema.item = getItemSchema();
        break;
      case "completed_item":
        schema.completed_item = getCompletedItemSchema();
        break;
      case "label":
        schema.label = getLabelSchema();
        break;
      case "user":
        schema.user = getUserSchema();
        break;
      case "date":
        schema.date = getDateSchema();
        break;
      case "week":
        schema.week = getWeekSchema();
        break;
      case "month":
        schema.month = getMonthSchema();
      case "weekdayname":
        schema.weekdayname = getWeekDayNameSchema();
        break;
      default:
        break;
    }
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

const getDates = ({ filter, requestedType }) => {
  const { from, monthrange = 3 } = filter ?? {};
  const startDate = from ? dayjs(from) : dayjs().subtract(monthrange, "month");
  const endDate = dayjs().add(monthrange, "month");
  const dates = [];
  let currentDate = startDate;

  switch (requestedType) {
    case "date":
      while (currentDate.isBefore(endDate)) {
        dates.push({
          id: uuid("date_" + currentDate.format("YYYY-MM-DD")),
          name: currentDate.format("YYYY-MM-DD"),
          mmdd: currentDate.format("MM/DD"),
          date: currentDate.format("YYYY-MM-DD"),
          weekdayname: currentDate.format("dddd"),
          abbreviation_weekdayname: currentDate.format("ddd"),
        });
        currentDate = currentDate.add(1, "day");
      }
      break;

    case "week":
      while (currentDate.isBefore(endDate)) {
        const date_range = {
          start: currentDate.startOf("week").format("YYYY-MM-DD"),
          end: currentDate.endOf("week").format("YYYY-MM-DD"),
        };
        dates.push({
          id: uuid("week_" + currentDate.format("YYYY-MM-DD")),
          name: currentDate.format("YYYY[W]W M/D[~]"),
          week_number: currentDate.isoWeek(),
          yw: currentDate.format("YYYY-WW"),
          date_range: JSON.stringify(date_range),
          date_range_json: date_range,
        });
        currentDate = currentDate.add(1, "week").startOf("week");
      }
      break;

    case "month":
      while (currentDate.isBefore(endDate)) {
        const date_range = {
          start: currentDate.startOf("month").format("YYYY-MM-DD"),
          end: currentDate.endOf("month").format("YYYY-MM-DD"),
        };
        dates.push({
          id: uuid("month_" + currentDate.format("YYYY-MM-DD")),
          name: currentDate.format("MMM[, ]YYYY"),
          month_number: currentDate.format("MM"),
          date_range: JSON.stringify(date_range),
          date_range_json: date_range,
        });
        currentDate = currentDate.add(1, "month").startOf("month");
      }
      break;

    default:
      return [];
  }
  // console.log("dates: ", dates);
  return dates;
};

const getWeekDayNames = () => {
  return [
    {
      id: uuid("monday"),
      name: "Monday",
      abbreviation_name: "Mon",
      weekdaynumber: 1,
    },
    {
      id: uuid("tuesday"),
      name: "Tuesday",
      abbreviation_name: "Tue",
      weekdaynumber: 2,
    },
    {
      id: uuid("wednesday"),
      name: "Wednesday",
      abbreviation_name: "Wed",
      weekdaynumber: 3,
    },
    {
      id: uuid("thursday"),
      name: "Thursday",
      abbreviation_name: "Thu",
      weekdaynumber: 4,
    },
    {
      id: uuid("friday"),
      name: "Friday",
      abbreviation_name: "Fri",
      weekdaynumber: 5,
    },
    {
      id: uuid("saturday"),
      name: "Saturday",
      abbreviation_name: "Sat",
      weekdaynumber: 6,
    },
    {
      id: uuid("sunday"),
      name: "Sunday",
      abbreviation_name: "Sun",
      weekdaynumber: 7,
    },
  ];
};

// due object
// {
//   "date": "2016-12-01",
//   "timezone": null,
//   "string": "every day",
//   "lang": "en",
//   "is_recurring": true
// }
const getDateRelationValue = ({
  requestedType,
  item,
  dates,
  weeks,
  months,
  weekdaynames,
}) => {
  // console.log("item: ", item);
  const date_due_or_completed = item.due?.date ?? item.completed_at ?? null;
  // console.log("date_due_or_completed: ", date_due_or_completed);
  if (_.isEmpty(date_due_or_completed)) {
    return null;
  }
  // const date = dayjs(date_due_or_completed);

  switch (requestedType) {
    case "date":
      return dates
        .filter((d) => dayjs(d.date).isSame(date_due_or_completed, "day"))
        .map((e) => e.id);

    case "week":
      return weeks
        .filter((w) => {
          return dayjs(date_due_or_completed).isBetween(
            w.date_range_json.start,
            w.date_range_json.end,
            "day",
            "[]"
          );
          // w.date_range_json.start <= date_due_or_completed && date_due_or_completed <= w.date_range_json.end
        })
        .map((e) => e.id);

    case "month":
      return months
        .filter((m) => {
          return dayjs(date_due_or_completed).isBetween(
            m.date_range_json.start,
            m.date_range_json.end,
            "day",
            "[]"
          );
        })
        .map((e) => e.id);

    case "weekdayname":
      return weekdaynames
        .filter(
          (d) =>
            d.abbreviation_name === dayjs(date_due_or_completed).format("ddd")
        )
        .map((e) => e.id);

    default:
      return null;
  }

  // let week_ids = [];
  // const weekItem = weeks.filter((w) => {
  //   return dayjs(due_date).isBetween(w.date_range_json.start, w.date_range_json.end, 'day', '[]')
  //   // w.date_range_json.start <= due_date && due_date <= w.date_range_json.end
  // });
  // console.log("weekItem: ", weekItem);
  // if (weekItem) {
  //   week_ids = weekItem.map(e => e.id);
  // }

  // let month_ids = [];
  // const monthItem = months.filter((m) =>  m.date_range_json.start <= due_date && due_date <= m.date_range_json.end);
  // if (monthItem) {
  //   month_ids = monthItem.map(e => e.id);
  // }
  // return {date_ids, week_ids, month_ids};
};

const processItem = ({ schema, item }) => {
  const r = {};
  const dates = getDates({ filter: {}, requestedType: "date" });
  const weeks = getDates({ filter: {}, requestedType: "week" });
  const months = getDates({ filter: {}, requestedType: "month" });
  const weekdaynames = getWeekDayNames();
  _.keys(schema).forEach((id) => {
    const schemaValue = schema[id];
    if (["date", "week", "month", "weekdayname"].includes(id)) {
      r[id] = getDateRelationValue({
        requestedType: id,
        item,
        dates,
        weeks,
        months,
        weekdaynames,
      });
      // if(id=="weekdayname"){
      //   console.log("r[id]: ", r[id]);
      // }
    } else {
      r[id] = getValue(item, schemaValue);
    }
  });
  return r;
};

const resolveSchema = async ({ requestedType }) => {
  console.log("resolveSchema: requestedType: ", requestedType);
  switch (requestedType) {
    case "project":
      return projectSchema;
    case "item":
      return itemSchema;
    case "completed_item":
      return completedItemSchema;
    case "label":
      return labelSchema;
    case "user":
      return userSchema;
    case "date":
      return dateSchema;
    case "week":
      return weekSchema;
    case "month":
      return monthSchema;
    case "weekdayname":
      return weekDayNameSchema;
    default:
      break;
  }
};

// const getMonths = ({ account, filter }) => {
//   const { from, monthrange } = filter;
//   const startDate = dayjs().subtract(monthrange, "month");
//   const endDate = dayjs().add(monthrange, "month");
//   const dates = [];
//   let currentDate = startDate;
//   while (currentDate.isBefore(endDate)) {
//     dates.push({
//       id: uuid("month_" + currentDate.format("YYYY-MM-DD")),
//       name: currentDate.format("MMM"),
//       month_number: currentDate.format("MM"),
//       date_range: {
//         start: currentDate.startOf("month").format("YYYY-MM-DD"),
//         end: currentDate.endOf("month").format("YYYY-MM-DD"),
//       },
//     });
//     currentDate = currentDate.add(1, "month").startOf("month");
//   }
//   return dates;
// };

// const getWeeks = ({ account, filter }) => {
//   const { from, monthrange } = filter;
//   const startDate = dayjs().subtract(monthrange, "month");
//   const endDate = dayjs().add(monthrange, "month");
//   const dates = [];
//   let currentDate = startDate;
//   while (currentDate.isBefore(endDate)) {
//     dates.push({
//       id: uuid("month_" + currentDate.format("YYYY-MM-DD")),
//       name: currentDate.format("MMM"),
//       week_number: currentDate.isoWeek(),
//       yw: currentDate.format("YYYY-WW"),
//       date_range: {
//         start: currentDate.startOf("week").format("YYYY-MM-DD"),
//         end: currentDate.endOf("week").format("YYYY-MM-DD"),
//       },
//     });
//     currentDate = currentDate.add(1, "week").startOf("week");
//   }
//   return dates;
// };

const getData = async ({ account, filter, requestedType }) => {
  console.log("getData: account: ", account);
  switch (requestedType) {
    case "project":
      return await getSingleResourceFromSyncApi({account, resourceType: "projects"});
      case "item":
      return await getSingleResourceFromSyncApi({account, resourceType: "items"});
      case "label":
      return await getSingleResourceFromSyncApi({account, resourceType: "labels"});
    case "completed_item":
      return await getCompletedItemsSyncApi({ account });
    case "user":
      return await getUsersSyncApi({ account });

    case "date":
    case "week":
    case "month":
      return getDates({ account, filter, requestedType });

    case "weekdayname":
      return getWeekDayNames({ account, filter, requestedType });

    default:
      return [];
  }
};

module.exports.data = async ({ account, filter, requestedType }) => {
  console.log("filter: ", filter);
  // const client = getTodoistClient(account);
  const schema = await resolveSchema({ requestedType });
  // schema = addPathProperty(schema);
  // console.log("schema: ", schema);
  const {data, sync_token, full_sync} = await getData({ account, filter, requestedType });
  console.log("requestedType: ", requestedType);
  console.log("sync_token, full_sync: ", sync_token, full_sync);

  if (data.length > 0) {
    switch (requestedType) {
      case "project":
      case "item":
      case "completed_item":
      case "label":
      case "user":
        return {
          items: data.map((item) => processItem({ schema, item })),

        };

      case "date":
      case "week":
      case "month":
        return { items: data };

      case "weekdayname":
        return { items: data };

      default:
        return { items: [] };
    }
  } else {
    return {
      items: [],
    };
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
