const request = require(`supertest`);
const app = require(`../app/app`);
const assert = require(`assert`);
const _ = require(`lodash`);

describe(`integration app suite`, function () {
  it(`should have the logo`, async () => {
    await request(app).get(`/logo`)
      .expect(200)
      .expect(`Content-Type`, /svg/);
  });

  it(`should have app config`, async () => {
    const {body: appConfig} = await request(app).get(`/`)
      .expect(200).expect(`Content-Type`, /json/);

    assert.equal(appConfig.name, `Public Holidays`);
    assert.match(appConfig.description, /public holidays/);
    assert.equal(appConfig.responsibleFor.dataSynchronization, true);
  });

  it(`should have validate end-point`, async () => {
    const {body: {name}} = await request(app).post(`/validate`)
      .expect(200).expect(`Content-Type`, /json/);
    assert.equal(name, `Public`);
  });

  it(`should have synchronization config`, async () => {
    const {body: {types, filters}} = await request(app)
      .post(`/api/v1/synchronizer/config`)
      .expect(200)
      .expect(`Content-Type`, /json/);
    assert.equal(types.length, 1);
    assert.equal(filters.length, 3);
  });

  it(`should have schema holidays type defined`, async () => {
    const {body: {holiday}} = await request(app)
      .post(`/api/v1/synchronizer/schema`)
      .send()
      .expect(200)
      .expect(`Content-Type`, /json/);
    assert.deepEqual(holiday.id, {name: `Id`, type: `id`});
  });

  it(`should return data for CY`, async () => {
    const {body: {items}} = await request(app)
      .post(`/api/v1/synchronizer/data`)
      .send({
        requestedType: `holiday`,
        filter: {
          countries: [`CY`],
        }
      }).expect(200).expect(`Content-Type`, /json/);
    assert.equal(items.length > 0, true);
    const holiday = items[0];
    assert.equal(holiday.id.length > 0, true);
    assert.equal(holiday.name.length > 0, true);
  });

  it(`should return data for BY and 2020 year only`, async () => {
    const {body: {items}} = await request(app)
      .post(`/api/v1/synchronizer/data`)
      .send({
        requestedType: `holiday`,
        filter: {
          countries: [`BY`],
          from: 2020,
          to: 2020
        }
      }).expect(200).expect(`Content-Type`, /json/);
    assert.equal(items.length > 0, true);
    const holidaysOtherThan2020 = _.filter(items, (i) => 
      new Date(i.date).getFullYear() !== 2020);
    assert.equal(holidaysOtherThan2020.length > 0, false);
  });
});