import { writeFileSync } from '$utils';
import ReactRefreshRuntime from './reactRefreshRuntimeCode.js?raw';

function initFiles() {
  writeFileSync('/node_modules/react-refresh/cjs/react-refresh-runtime.development.js', ReactRefreshRuntime);
}

// 写入部分文件到内存文件系统
initFiles();
