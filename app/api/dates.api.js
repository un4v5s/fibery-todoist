const _ = require("lodash");
const uuid = require(`uuid-by-string`);
require(`dotenv`).config();

const dayjs = require("dayjs");
dayjs.extend(require("dayjs/plugin/isoWeek"));
dayjs.extend(require("dayjs/plugin/advancedFormat"));
dayjs.extend(require("dayjs/plugin/isBetween"));
dayjs.extend(require("dayjs/plugin/utc"));
dayjs.extend(require("dayjs/plugin/timezone"));

module.exports.getDates = ({ filter, requestedType }) => {
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

module.exports.getWeekDayNames = () => {
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
module.exports.getDateRelation = ({
  requestedType,
  item,
  dates,
  weeks,
  months,
  weekdaynames,
}) => {
  console.log(item.content);
  const tmp_date = item.completed_at ?? item.due?.date ?? null;
  if (_.isEmpty(tmp_date)) {
    return null;
  }
  const date_due_or_completed = dayjs(tmp_date).utc().format();
  console.log("date_due_or_completed: ", date_due_or_completed);

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
};
