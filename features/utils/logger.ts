import {format as wFormat, createLogger, transports} from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export const wLogger = createLogger({
    level: 'info',
    format: wFormat.combine(
        wFormat.timestamp(),
        wFormat.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new transports.Console(),
        new DailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '7d',
        }),
    ],
});