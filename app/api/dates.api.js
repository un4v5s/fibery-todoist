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
  let { from, monthrange } = filter;
  from = from ?? null; // default and destructuring assignment can't be use with null
  monthrange = monthrange ?? 3;
  const startDate = _.isEmpty(from)
    ? dayjs()
        .utc()
        .startOf("day")
        .startOf("month")
        .subtract(monthrange, "month")
    : dayjs(from).utc().startOf("day").startOf("month");
  const endDate = dayjs()
    .utc()
    .add(monthrange, "month")
    .startOf("day")
    .endOf("month");
  const dates = [];
  let currentDate = startDate.clone();

  switch (requestedType) {
    case "date":
      while (currentDate.isBefore(endDate)) {
        dates.push({
          id: uuid("date_" + currentDate.format("YYYY-MM-DD")),
          name: currentDate.format("YYYY-MM-DD"),
          mmdd: currentDate.format("MM/DD"),
          date: currentDate.startOf("day").format(),
          abbreviation_weekdayname: currentDate.format("ddd"),
          week: uuid(
            "week_" + currentDate.startOf("isoWeek").format("YYYY-MM-DD")
          ),
          month: uuid(
            "month_" + currentDate.startOf("month").format("YYYY-MM-DD")
          ),
          weekdayname: uuid(currentDate.format("dddd").toLowerCase()),
        });
        currentDate = currentDate.add(1, "day");
      }
      break;

    case "week":
      while (currentDate.isBefore(endDate)) {
        const date_range = {
          start: currentDate.startOf("isoWeek").format("YYYY-MM-DD"),
          end: currentDate
            .startOf("isoWeek")
            .add(7, "day")
            .format("YYYY-MM-DD"),
          // end: currentDate.endOf("isoWeek").format("YYYY-MM-DD"), // not working
        };
        dates.push({
          id: uuid("week_" + currentDate.format("YYYY-MM-DD")),
          name: currentDate.format("YYYY[W]W M/D[~]"),
          week_number: currentDate.isoWeek(),
          yw: currentDate.format("YYYY-WW"),
          date_range: JSON.stringify(date_range),
          date_range_json: date_range,
          month: uuid(
            "month_" +
              currentDate
                .startOf("isoWeek")
                .startOf("month")
                .format("YYYY-MM-DD")
          ),
        });
        currentDate = currentDate.add(1, "week").startOf("isoWeek");
      }
      break;

    case "month":
      while (currentDate.isBefore(endDate)) {
        const daysInMonth = currentDate.daysInMonth();
        const date_range = {
          start: currentDate.startOf("month").format("YYYY-MM-DD"),
          end: currentDate
            .startOf("month")
            .add(daysInMonth, "days")
            .format("YYYY-MM-DD"),
          // end: currentDate.endOf("month").format("YYYY-MM-DD"), // not working
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
  const date_due_or_completed = item.completed_at ? dayjs(item.completed_at).utc()
    : item.due?.date ? dayjs(item.due?.date).utc(true)
    : null;
  // console.log("date_due_or_completed: ", date_due_or_completed);

  switch (requestedType) {
    case "date":
      return dates
        .filter((d) => dayjs(d.date).isSame(date_due_or_completed, "day"))
        .map((e) => e.id);

    case "week":
      return weeks
        .filter((w) => {
          return dayjs(date_due_or_completed).isBetween(
            // w.date_range_json.start,
            // w.date_range_json.end,
            dayjs(w.date_range_json.start).utc(true).startOf("day"),
            dayjs(w.date_range_json.end).utc(true).endOf("day"),
            "day",
            "[)"
          );
        })
        .map((e) => e.id);

    case "month":
      return months
        .filter((m) => {
          return dayjs(date_due_or_completed).isBetween(
            dayjs(m.date_range_json.start).utc(true).startOf("day"),
            dayjs(m.date_range_json.end).utc(true).endOf("day"),
            "day",
            "[)"
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
