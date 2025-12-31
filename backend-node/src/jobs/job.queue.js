const Queue = require('bull');
const { Job } = require('../models');

const jobQueue = new Queue('pdf-processing', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

jobQueue.process(async (job) => {
    // This is where the actual worker logic would go.
    // We would switch(job.data.type) and call appropriate tool services.
    console.log(`Processing job ${job.id} of type ${job.data.type}`);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    return { result: 'processed_file_path.pdf' };
});

jobQueue.on('completed', async (job, result) => {
    console.log(`Job ${job.id} completed! Result: ${result}`);
    // Update Job DB status
    await Job.update({ status: 'COMPLETED', result: result }, { where: { id: job.data.dbId } });
});

jobQueue.on('failed', async (job, err) => {
    console.log(`Job ${job.id} failed with ${err.message}`);
    await Job.update({ status: 'FAILED', error: err.message }, { where: { id: job.data.dbId } });
});

module.exports = jobQueue;
