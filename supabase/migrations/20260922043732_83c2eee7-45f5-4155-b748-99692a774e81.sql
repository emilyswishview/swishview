SELECT cron.alter_job(4, schedule => '0 * * * *');
SELECT cron.alter_job(10, schedule => '*/2 * * * *');