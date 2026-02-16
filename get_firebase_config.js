import { exec } from 'node:child_process';
exec('firebase apps:sdkconfig web 1:953735305510:web:38664e3d6938618a6909e7 > config_node.txt', { shell: true }, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log('Done');
});
