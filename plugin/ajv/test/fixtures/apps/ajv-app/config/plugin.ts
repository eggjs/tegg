export default () => {
  return {
    tracer: {
      package: '@eggjs/tracer',
      enable: true,
    },
    tegg: {
      package: '@eggjs/tegg-plugin',
      enable: true,
    },
    teggConfig: {
      package: '@eggjs/tegg-config',
      enable: true,
    },
    teggController: {
      package: '@eggjs/tegg-controller-plugin',
      enable: true,
    },
  };
};

