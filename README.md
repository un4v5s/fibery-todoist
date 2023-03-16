# Fibery - Todoist integration app

## Overview

Status: Under development

Currently, this project is a personal development project for myself. I have made it Public in order to receive feedback, but please be careful when using it as it is not yet complete.

This is an integration app to import and display Todoist tasks and projects in Fibery.

This is a unidirectional synchronous integration feature that simply displays tasks and projects in Todoist on the Fibery side.

As of March 2023, a Bata version of [partial bi-directional sync](https://the.fibery.io/@public/User_Guide/Guide/Jira-two-way-sync-159) has been implemented in the official Fibery-developed JIRA integration.

In the future, when bi-directional sync development becomes available for the Fibery integration API, I intend to implement bi-directional sync in this project as well.

<br>

## Usage

This is still a development version, so please clone and host it by yourself.

<br>

## Implemented Features

- Unidirectional synchronization of Todoist Task, Project, Label, and Collabolator.
- Automatic synchronization of any period of time (every 60 to 240 minutes) set in Fibery.
- Provides not only the same display as Todoist, but also more diverse perspectives through the use of the originally implemented Day, Week, Month, and Week day name DBs.
- (Note: Completed Items are also retrieved, but the number of items retrieved is subject to the limitations of your Todoist plan)

<br>

## Features to be developed in the future

- (Currently no way to implement) Bi-directional sync of some attributes.
- (Currently no way to implement) Partial overwrite.
- (Under development feasibility study) Near realtime sync with incoming webhooks.

<br>

## Features

### Sample and suggested views

**Calendar view:**<br>
You can see the list of tasks in a calendar view, which does not exist in Todoist. <br>
<img src="./imgs/calendar.jpg" width="70%" />

**Day Board View:**<br>
This view is similar to Todoist's Board view and can also display subtasks. <br>
<img src="./imgs/dayboard.jpg" width="70%" />

**Week Board View:**<br>
This is a week view, which is not possible in Todoist. <br>
<img src="./imgs/weekboard.jpg" width="70%" />

**Week day name View:**<br>
Vertical axis is the day of the week of ISO week, which Todoist cannot display. <br>
This display is similar to a calendar, but can show more fields. <br>
<img src="./imgs/weekdaynameboard.jpg" width="70%" />

**Month View**:<br>
For example, if you filter to only recurring tasks that only occur on a weekly or monthly basis, you can probably get a better idea of the appearance schedule. <br>
<img src="./imgs/monthboard.jpg" width="70%" />

### And more...

Addition of these, the freedom of Fibery can be applied to Todoist.

In the future, when this application becomes stable/mature, it may be possible to turn on the setting to keep past data (see image below) and generate a graph where completed tasks can be evaluated.

It may also be possible to replicate Todoist's Karma.

<img src="./imgs/donotdeletefiberyentities.png" width="50%" />

<br>

## Ingenious point
- In Todoist, the completion status of a task is handled by the bool value of checked, but in order to make it visually clear on the Fibery side, it is synchronized as a Work Flow.
- Implementing the time zone was quite a challenge. I implemented it by making full use of `utc()` and `utc(true)` in [Day.js](https://day.js.org/en/).

<br>

## Things I noticed during development (to other developers)

- You can also specify workflow as a subType for text, in addition to what is listed in the documentation.
  - The subtype can probably be roughly the dropdown in the image below (untested)
  - <img src="./imgs/subtypes.png" width="20%" />
- Although not mentioned in the documentat, the actual value passed when subType is `date-range` is in the following format
  - `JSON.stringify({start: YYYY-MM-DD, end: YYYY-MM-DD})`
- It seems possible to implement near realtime sync of some fields by responding to Incoming Webhooks.
  - The officially developed Intercom integration uses [this feature](https://the.fibery.io/@public/User_Guide/Guide/Intercom-integration-73/anchor=Change-sync-interval--c57554b4-9a53-4623-9a89-506043592763).

<br>

## References.

- [Todoist Sync API v9](https://developer.todoist.com/sync/v9/)
- [Fibery integration API](https://api.fibery.io/apps.html)
- [Fibery Guide about Timezones](https://the.fibery.io/@public/User_Guide/Guide/Timezones-41)
- [Fibery integration app example Notion app](https://gitlab.com/fibery-community/notion-app)
- [Fibery integration app example Public Holiday app](https://gitlab.com/fibery-community/holidays-integration-app)
- [Fibery integration app example Sample apps](https://gitlab.com/fibery-community/integration-sample-apps)
- [Day.js](https://day.js.org/)