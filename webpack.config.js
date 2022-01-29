'use strict';

const path = require('path');
const webpack = require('webpack');

function digitaljsWorker(env, argv) {
    return {
        name: 'web_worker',
        target: 'webworker',
        entry: './node_modules/digitaljs/src/engines/worker-worker.mjs',
        output: {
            path: path.join(__dirname, 'dist'),
            filename: 'digitaljs-webworker.js'
        },
        plugins: [
            new webpack.optimize.LimitChunkCountPlugin({
                maxChunks: 1
            })
        ]
    };
}

module.exports = [digitaljsWorker];
