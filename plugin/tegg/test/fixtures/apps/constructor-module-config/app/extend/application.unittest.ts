import { MockApplication } from 'egg-mock';

export default {
  mockUser(this: MockApplication) {
    this.mockContext({
      user: {
        userName: 'mock_user',
      },
    });
  },
};
