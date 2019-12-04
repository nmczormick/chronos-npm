const mongoose = require('mongoose');
// NPM package that gathers health information
const si = require('systeminformation');

//Required to get rid of deprecation warnings
mongoose.set("useUnifiedTopology", true);
mongoose.set("useNewUrlParser", true);

const chronos = {};

// queryObj determines the setInterval needed for microHealth based on queryFreq parameter provided by user
let queryObj = {
  s: 1000, // 1000 ms/sec
  m: 60000, // 1000 ms/sec * 60 sec/min
  h: 3600000, // 60 seconds * 60 minutes per hour * 1000 milliseconds per second
  d: 86400000, // 60 sec. * 60 min * 1000 ms per sec * 24 hours per day
  w: 604800000, // 60 sec/min * 60 min/hr * 1000 ms/sec * 24 hours/day * 7 days per week
}

(chronos.connectDB = userOwnedDB => {
  // create connection to user owned database
  mongoose.connect(`${userOwnedDB}`, () => {
    console.log("Chronos database is connected...");
  });
}),

(chronos.microCom = (userOwnedDB, userInputMSName) => {
  chronos.connectDB(userOwnedDB);
  return function(req, res, next) {
    const currentMicroservice = userInputMSName;

    require("./Communication.js/index.js");
    const Communication = mongoose.model("Communication");

    const newCommunication = {
      currentMicroservice: currentMicroservice,
      targetedEndpoint: req.originalUrl,
      reqType: req.method,
      timeSent: Date.now()
    };

    res.on("finish", () => {
      newCommunication.resStatus = res.statusCode;
      newCommunication.resMessage = res.statusMessage;
      const communication = new Communication(newCommunication);

      communication
        .save()
        .then(() => {
          next();
        })
        .catch(err => {
          if (err) {
            throw err;
          }
        });
    });
    next();
  };
}),

(chronos.microHealth = (userOwnedDB, userInputMSName, queryFreq) => {
  chronos.connectDB(userOwnedDB);
  require("../databases/MicroserviceHealth.js");
  const MicroserviceHealth = mongoose.model("MicroserviceHealth");
  let cpuCurrentSpeed,
    cpuTemperature,
    cpuCurrentLoadPercentage,
    totalMemory,
    freeMemory,
    usedMemory,
    activeMemory,
    latency,
    totalNumProcesses,
    numBlockedProcesses,
    numRunningProcesses,
    numSleepingProcesses;

  setInterval(() => {
    si.cpuCurrentspeed()
      .then(data => {
        cpuCurrentSpeed = data.avg;
      })
      .catch(err => {
        if (err) {
          throw err;
        }
      });

    si.cpuTemperature()
      .then(data => {
        cpuTemperature = data.main;
      })
      .catch(err => {
        if (err) {
          throw err;
        }
      });

    si.currentLoad()
      .then(data => {
        cpuCurrentLoadPercentage = data.currentload;
      })
      .catch(err => {
        throw err;
      });

    si.mem()
      .then(data => {
        totalMemory = data.total;
        freeMemory = data.free;
        usedMemory = data.used;
        activeMemory = data.active;
      })
      .catch(err => {
        if (err) {
          throw err;
        }
      });

    si.processes()
      .then(data => {
        totalNumProcesses = data.all;
        numBlockedProcesses = data.blocked;
        numRunningProcesses = data.running;
        numSleepingProcesses = data.sleeping;
      })
      .catch(err => {
        if (err) {
            throw err;
        }
      });

    si.inetLatency()
      .then(data => {
        latency = data;
      })
      .catch(err => {
        if (err) {
          throw err;
        }
      });

    const newHealthPoint = {
      timestamp: Date.now(),
      currentMicroservice: userInputMSName,
      cpuCurrentSpeed: cpuCurrentSpeed,
      cpuTemperature: cpuTemperature,
      cpuCurrentLoadPercentage: cpuCurrentLoadPercentage,
      totalMemory: totalMemory,
      freeMemory: freeMemory,
      usedMemory: usedMemory,
      activeMemory: activeMemory,
      totalNumProcesses: totalNumProcesses,
      numRunningProcesses: numRunningProcesses,
      numBlockedProcesses: numBlockedProcesses,
      numSleepingProcesses: numSleepingProcesses,
      latency: latency
    };

    const healthPoint = new MicroserviceHealth(newHealthPoint);
    healthPoint
      .save()
      .then(() => {})
      .catch(err => {
        if (err) {
          throw err;
        }
      });
  }, queryObj[queryFreq]);
});

module.exports = chronos;

