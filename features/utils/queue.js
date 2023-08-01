const {queue} = require("async");
/*
  This function that will push the tasks to async.queue,
  and then hand them to your worker function
*/

function processQ(tasks, concurrency, worker) {
    return new Promise((resolve, reject) => {
        var results = [], called = false;

        const q = queue(function qWorker(task, qcb) {
            worker(task, function wcb(err, data) {
                //    console.log("wcb")
                if (err) {
                    //    console.log("qcb err")
                    return qcb(err); //Here how we propagate error to qcb
                }

                results.push(data);
                //  console.log("qcb")

                qcb();
            });
        }, concurrency);

        /*
          The trick is in this function, note that checking q.tasks.length
          does not work q.kill introduced in async 0.7.0, it is just setting
          the drain function to null and the tasks length to zero
        */

        q.push(tasks, function qcb(err) {
            if (!called) {
                if (err) {
                   // console.log("pcb err")
                    q.kill();
                    called = true;
                    reject(err);
                }
            }
        });

        q.drain(() => {
          //  console.log("pcb")
          //  console.log("Drained");
            resolve(results);
        });
    });
}

module.exports = {processQ}