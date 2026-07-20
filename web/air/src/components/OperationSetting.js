import React, { useEffect, useState } from 'react';
import { Divider, Form, Grid, Header } from 'semantic-ui-react';
import { API, showError, showSuccess, timestamp2string, verifyJSON } from '../helpers';

const OperationSetting = () => {
  let now = new Date();
  let [inputs, setInputs] = useState({
    DailyPointsByGroup: '{"default":0}',
    PointsRefreshTime: '00:00',
    PointsRefreshTimezone: 'Asia/Shanghai',
    PreConsumedPoints: 0,
    ModelRatio: '',
    CompletionRatio: '',
    GroupRatio: '',
    ChatLink: '',
    AutomaticDisableChannelEnabled: '',
    AutomaticEnableChannelEnabled: '',
    ChannelDisableThreshold: 0,
    LogConsumeEnabled: '',
    DisplayTokenStatEnabled: '',
    ApproximateTokenEnabled: '',
    RetryTimes: 0
  });
  const [originInputs, setOriginInputs] = useState({});
  let [loading, setLoading] = useState(false);
  let [historyTimestamp, setHistoryTimestamp] = useState(timestamp2string(now.getTime() / 1000 - 30 * 24 * 3600)); // a month ago

  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (success) {
      let newInputs = {};
      data.forEach((item) => {
        if (item.key === 'ModelRatio' || item.key === 'GroupRatio' || item.key === 'CompletionRatio') {
          item.value = JSON.stringify(JSON.parse(item.value), null, 2);
        }
        if (item.value === '{}') {
          item.value = '';
        }
        newInputs[item.key] = item.value;
      });
      setInputs(newInputs);
      setOriginInputs(newInputs);
    } else {
      showError(message);
    }
  };

  useEffect(() => {
    getOptions().then();
  }, []);

  const updateOption = async (key, value) => {
    setLoading(true);
    if (key.endsWith('Enabled')) {
      value = inputs[key] === 'true' ? 'false' : 'true';
    }
    const res = await API.put('/api/option/', {
      key,
      value
    });
    const { success, message } = res.data;
    if (success) {
      setInputs((inputs) => ({ ...inputs, [key]: value }));
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const handleInputChange = async (e, { name, value }) => {
    if (name.endsWith('Enabled')) {
      await updateOption(name, value);
    } else {
      setInputs((inputs) => ({ ...inputs, [name]: value }));
    }
  };

  const submitConfig = async (group) => {
    switch (group) {
      case 'monitor':
        if (originInputs['ChannelDisableThreshold'] !== inputs.ChannelDisableThreshold) {
          await updateOption('ChannelDisableThreshold', inputs.ChannelDisableThreshold);
        }
        break;
      case 'ratio':
        if (originInputs['ModelRatio'] !== inputs.ModelRatio) {
          if (!verifyJSON(inputs.ModelRatio)) {
            showError('模型倍率不是合法的 JSON 字符串');
            return;
          }
          await updateOption('ModelRatio', inputs.ModelRatio);
        }
        if (originInputs['GroupRatio'] !== inputs.GroupRatio) {
          if (!verifyJSON(inputs.GroupRatio)) {
            showError('分组倍率不是合法的 JSON 字符串');
            return;
          }
          await updateOption('GroupRatio', inputs.GroupRatio);
        }
        if (originInputs['CompletionRatio'] !== inputs.CompletionRatio) {
          if (!verifyJSON(inputs.CompletionRatio)) {
            showError('补全倍率不是合法的 JSON 字符串');
            return;
          }
          await updateOption('CompletionRatio', inputs.CompletionRatio);
        }
        break;
      case 'quota':
        if (originInputs['DailyPointsByGroup'] !== inputs.DailyPointsByGroup) {
          if (!verifyJSON(inputs.DailyPointsByGroup)) {
            showError('分组积分配置不是合法的 JSON 字符串');
            return;
          }
          await updateOption('DailyPointsByGroup', inputs.DailyPointsByGroup);
        }
        if (originInputs['PointsRefreshTime'] !== inputs.PointsRefreshTime) {
          await updateOption('PointsRefreshTime', inputs.PointsRefreshTime);
        }
        if (originInputs['PointsRefreshTimezone'] !== inputs.PointsRefreshTimezone) {
          await updateOption('PointsRefreshTimezone', inputs.PointsRefreshTimezone);
        }
        if (originInputs['PreConsumedPoints'] !== inputs.PreConsumedPoints) {
          await updateOption('PreConsumedPoints', inputs.PreConsumedPoints);
        }
        break;
      case 'general':
        if (originInputs['ChatLink'] !== inputs.ChatLink) {
          await updateOption('ChatLink', inputs.ChatLink);
        }
        if (originInputs['RetryTimes'] !== inputs.RetryTimes) {
          await updateOption('RetryTimes', inputs.RetryTimes);
        }
        break;
    }
  };

  const deleteHistoryLogs = async () => {
    console.log(inputs);
    const res = await API.delete(`/api/log/?target_timestamp=${Date.parse(historyTimestamp) / 1000}`);
    const { success, message, data } = res.data;
    if (success) {
      showSuccess(`${data} 条日志已清理！`);
      return;
    }
    showError('日志清理失败：' + message);
  };

  return (
    <Grid columns={1}>
      <Grid.Column>
        <Form loading={loading}>
          <Header as='h3'>
            通用设置
          </Header>
          <Form.Group widths={4}>
            <Form.Input
              label='聊天页面链接'
              name='ChatLink'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.ChatLink}
              type='link'
              placeholder='例如 ChatGPT Next Web 的部署地址'
            />
            <Form.Input
              label='失败重试次数'
              name='RetryTimes'
              type={'number'}
              step='1'
              min='0'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.RetryTimes}
              placeholder='失败重试次数'
            />
          </Form.Group>
          <Form.Group inline>
            <Form.Checkbox
              checked={inputs.DisplayTokenStatEnabled === 'true'}
              label='Billing 相关 API 显示令牌额度而非用户额度'
              name='DisplayTokenStatEnabled'
              onChange={handleInputChange}
            />
            <Form.Checkbox
              checked={inputs.ApproximateTokenEnabled === 'true'}
              label='使用近似的方式估算 token 数以减少计算量'
              name='ApproximateTokenEnabled'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={() => {
            submitConfig('general').then();
          }}>保存通用设置</Form.Button>
          <Divider />
          <Header as='h3'>
            日志设置
          </Header>
          <Form.Group inline>
            <Form.Checkbox
              checked={inputs.LogConsumeEnabled === 'true'}
              label='启用额度消费日志记录'
              name='LogConsumeEnabled'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Group widths={4}>
            <Form.Input label='目标时间' value={historyTimestamp} type='datetime-local'
                        name='history_timestamp'
                        onChange={(e, { name, value }) => {
                          setHistoryTimestamp(value);
                        }} />
          </Form.Group>
          <Form.Button onClick={() => {
            deleteHistoryLogs().then();
          }}>清理历史日志</Form.Button>
          <Divider />
          <Header as='h3'>
            监控设置
          </Header>
          <Form.Group widths={3}>
            <Form.Input
              label='最长响应时间'
              name='ChannelDisableThreshold'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.ChannelDisableThreshold}
              type='number'
              min='0'
              placeholder='单位秒，当运行渠道全部测试时，超过此时间将自动禁用渠道'
            />
          </Form.Group>
          <Form.Group inline>
            <Form.Checkbox
              checked={inputs.AutomaticDisableChannelEnabled === 'true'}
              label='失败时自动禁用渠道'
              name='AutomaticDisableChannelEnabled'
              onChange={handleInputChange}
            />
            <Form.Checkbox
              checked={inputs.AutomaticEnableChannelEnabled === 'true'}
              label='成功时自动启用渠道'
              name='AutomaticEnableChannelEnabled'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={() => {
            submitConfig('monitor').then();
          }}>保存监控设置</Form.Button>
          <Divider />
          <Header as='h3'>
            积分设置
          </Header>
          <Form.Group widths={4}>
            <Form.Input
              label='分组每日积分(JSON)'
              name='DailyPointsByGroup'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.DailyPointsByGroup}
              placeholder='例如 {"default":1000,"dev":3000}'
            />
            <Form.Input
              label='请求预扣积分'
              name='PreConsumedPoints'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.PreConsumedPoints}
              type='number'
              min='0'
              placeholder='请求结束后多退少补'
            />
            <Form.Input
              label='刷新时间'
              name='PointsRefreshTime'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.PointsRefreshTime}
              placeholder='00:00'
            />
            <Form.Input
              label='刷新时区'
              name='PointsRefreshTimezone'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.PointsRefreshTimezone}
              placeholder='Asia/Shanghai'
            />
          </Form.Group>
          <Form.Button onClick={() => {
            submitConfig('quota').then();
          }}>保存积分设置</Form.Button>
          <Divider />
          <Header as='h3'>
            倍率设置
          </Header>
          <Form.Group widths='equal'>
            <Form.TextArea
              label='模型倍率'
              name='ModelRatio'
              onChange={handleInputChange}
              style={{ minHeight: 250, fontFamily: 'JetBrains Mono, Consolas' }}
              autoComplete='new-password'
              value={inputs.ModelRatio}
              placeholder='为一个 JSON 文本，键为模型名称，值为倍率'
            />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.TextArea
              label='补全倍率'
              name='CompletionRatio'
              onChange={handleInputChange}
              style={{ minHeight: 250, fontFamily: 'JetBrains Mono, Consolas' }}
              autoComplete='new-password'
              value={inputs.CompletionRatio}
              placeholder='为一个 JSON 文本，键为模型名称，值为倍率，此处的倍率设置是模型补全倍率相较于提示倍率的比例，使用该设置可强制覆盖 One API 的内部比例'
            />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.TextArea
              label='分组倍率'
              name='GroupRatio'
              onChange={handleInputChange}
              style={{ minHeight: 250, fontFamily: 'JetBrains Mono, Consolas' }}
              autoComplete='new-password'
              value={inputs.GroupRatio}
              placeholder='为一个 JSON 文本，键为分组名称，值为倍率'
            />
          </Form.Group>
          <Form.Button onClick={() => {
            submitConfig('ratio').then();
          }}>保存倍率设置</Form.Button>
        </Form>
      </Grid.Column>
    </Grid>
  );
};

export default OperationSetting;
