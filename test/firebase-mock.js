const sinon = require('sinon');
const chai = require('chai');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);

function firebaseMock({TIMESTAMP_PATH = '/timestamp'} = {}) {

  const firebaseRefOffSpy = sinon.stub().callsFake(path => {
    _callbacks[path] = {

    };
  });
  const firebaseRefOnSpy = sinon.stub();
  const serverTimeMock = sinon.stub().callsFake(() => new Date());

  const _callbacks = { };
  let _serverTime;
  const _data = {};

  const getDataAtPath = path => _data[path];

  const setDataAtPath = (path, data) => {
    _data[path] = data;
  };


  const createMockFirebaseRef = (path = '') => ({
    get on() {
      return firebaseRefOnSpy.callsFake((event, cb) => {
        _callbacks[path] = Object.assign({}, _callbacks[path], {
          [event]: {
            cb,
            options: this._options
          }
        });
      });
    },
    _options: {},
    off: () => firebaseRefOffSpy(path),
    orderByChild(child) {
      Object.assign(this._options, {
        orderByChild: child
      });
      return this;
    },
    startAt(value) {
      Object.assign(this._options, {
        startAt: value
      });
      return this;
    },
    once: arg => {
      if (path === TIMESTAMP_PATH && arg === 'value') {
        return Promise.resolve(createMockFirebaseSnapshot(_serverTime));
      }
      return Promise.resolve(createMockFirebaseSnapshot(getDataAtPath(path)));
    },
    set: value => {
      if (path === TIMESTAMP_PATH) {
        return Promise.resolve().then(() => _serverTime = value);
      } else {
        setDataAtPath(path, value);
      }
    }
  });



  const createMockFirebaseSnapshot = (valResult, keyResult, refPath) => ({
    val: () => valResult,
    key: keyResult,
    ref: createMockFirebaseRef(refPath)
  });

  const databaseSpy = {
    goOffline: sinon.stub(),
    goOnline: sinon.stub(),
  };

  const firebaseMock = {
    initializeApp: sinon.stub().callsFake(function () {
      return this;
    }),
    delete: sinon.stub(),
    auth: sinon.stub().callsFake(function () {
      return this;
    }),
    signInWithCustomToken: sinon.stub().callsFake(() => Promise.resolve()),
    database: () => ({
      ref: path => createMockFirebaseRef(path),
      app: firebaseMock,
      ...databaseSpy
    }),
    createMockFirebaseSnapshot,
    fireMockEvent: (path, event, snapshot) => {
      if (_callbacks[path] && _callbacks[path][event]) {
        const {cb, options} = _callbacks[path][event];
        const {startAt, orderByChild} = options;
        const optionsAreNotSet = !startAt || !orderByChild;
        if (optionsAreNotSet || snapshot.val()[orderByChild] >= startAt) {
          cb(snapshot);
        }
      }
    },
    spies: {
      firebaseRefOffSpy,
      firebaseRefOnSpy,
      databaseSpy,
    },
    setDataAtPath,
    mockServerTime: time => serverTimeMock.callsFake(() => time)
  };

  firebaseMock.database.ServerValue = {
    get TIMESTAMP() {
      return serverTimeMock();
    }
  };
  return firebaseMock;
}

module.exports = firebaseMock;
