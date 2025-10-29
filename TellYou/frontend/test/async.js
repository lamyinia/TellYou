async function run() {
  console.log("开始");
  setTimeout(() => console.log("回调执行"), 5000);

  await new Promise((resolve) => {
    setTimeout(() => {
      console.log("宏任务执行");
    }, 10000);
  });

  for (let i = 0; i < 3; ++i) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    // 模拟耗时操作
    const start = Date.now();
    while (Date.now() - start < 5000) {}
    console.log(`循环 ${i + 1}`);
  }
}

run();
