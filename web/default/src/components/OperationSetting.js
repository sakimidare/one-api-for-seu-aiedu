import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Divider, Form, Grid, Header } from 'semantic-ui-react';
import {
  API,
  showError,
  showSuccess,
  timestamp2string,
  verifyJSON,
} from '../helpers';

const OperationSetting = () => {
  const { t } = useTranslation();
  let now = new Date();
  let [inputs, setInputs] = useState({
    PointsRefreshTime: '00:00',
    PointsRefreshTimezone: 'Asia/Shanghai',
    LastPointsRefreshDate: '',
    PreConsumedPoints: 0,
    ModelRatio: '',
    CompletionRatio: '',
    ChatLink: '',
    AutomaticDisableChannelEnabled: '',
    AutomaticEnableChannelEnabled: '',
    ChannelDisableThreshold: 0,
    LogConsumeEnabled: '',
    DisplayTokenStatEnabled: '',
    ApproximateTokenEnabled: '',
    RetryTimes: 0,
  });
  const [originInputs, setOriginInputs] = useState({});
  let [loading, setLoading] = useState(false);
  let [historyTimestamp, setHistoryTimestamp] = useState(
    timestamp2string(now.getTime() / 1000 - 30 * 24 * 3600)
  ); // a month ago

  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (success) {
      let newInputs = {};
      data.forEach((item) => {
        if (
          item.key === 'ModelRatio' ||
          item.key === 'CompletionRatio'
        ) {
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
      value,
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
        if (
          originInputs['ChannelDisableThreshold'] !==
          inputs.ChannelDisableThreshold
        ) {
          await updateOption(
            'ChannelDisableThreshold',
            inputs.ChannelDisableThreshold
          );
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
        if (originInputs['CompletionRatio'] !== inputs.CompletionRatio) {
          if (!verifyJSON(inputs.CompletionRatio)) {
            showError('补全倍率不是合法的 JSON 字符串');
            return;
          }
          await updateOption('CompletionRatio', inputs.CompletionRatio);
        }
        break;
      case 'quota':
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
    const res = await API.delete(
      `/api/log/?target_timestamp=${Date.parse(historyTimestamp) / 1000}`
    );
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
          <Header as='h3'>积分配额</Header>
          <Form.Group widths='equal'>
            <Form.Input
              label='预扣积分'
              name='PreConsumedPoints'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.PreConsumedPoints}
              type='number'
              min='0'
              placeholder='请求开始时的预扣积分'
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
          <Form.Button
            onClick={() => {
              submitConfig('quota').then();
            }}
          >
            保存
          </Form.Button>
          <Divider />
          <Header as='h3'>{t('setting.operation.ratio.title')}</Header>
          <Form.Group widths='equal'>
            <Form.TextArea
              label={t('setting.operation.ratio.model.title')}
              name='ModelRatio'
              onChange={handleInputChange}
              style={{ minHeight: 250, fontFamily: 'JetBrains Mono, Consolas' }}
              autoComplete='new-password'
              value={inputs.ModelRatio}
              placeholder={t('setting.operation.ratio.model.placeholder')}
            />
          </Form.Group>
          <Form.Group widths='equal'>
            <Form.TextArea
              label={t('setting.operation.ratio.completion.title')}
              name='CompletionRatio'
              onChange={handleInputChange}
              style={{ minHeight: 250, fontFamily: 'JetBrains Mono, Consolas' }}
              autoComplete='new-password'
              value={inputs.CompletionRatio}
              placeholder={t('setting.operation.ratio.completion.placeholder')}
            />
          </Form.Group>
          <Form.Button
            onClick={() => {
              submitConfig('ratio').then();
            }}
          >
            {t('setting.operation.ratio.buttons.save')}
          </Form.Button>
          <Divider />
          <Header as='h3'>{t('setting.operation.log.title')}</Header>
          <Form.Group inline>
            <Form.Checkbox
              checked={inputs.LogConsumeEnabled === 'true'}
              label={t('setting.operation.log.enable_consume')}
              name='LogConsumeEnabled'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Group widths={4}>
            <Form.Input
              label={t('setting.operation.log.target_time')}
              value={historyTimestamp}
              type='datetime-local'
              name='history_timestamp'
              onChange={(e, { name, value }) => {
                setHistoryTimestamp(value);
              }}
            />
          </Form.Group>
          <Form.Button
            onClick={() => {
              deleteHistoryLogs().then();
            }}
          >
            {t('setting.operation.log.buttons.clean')}
          </Form.Button>

          <Divider />
          <Header as='h3'>{t('setting.operation.monitor.title')}</Header>
          <Form.Group widths={3}>
            <Form.Input
              label={t('setting.operation.monitor.max_response_time')}
              name='ChannelDisableThreshold'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.ChannelDisableThreshold}
              type='number'
              min='0'
              placeholder={t(
                'setting.operation.monitor.max_response_time_placeholder'
              )}
            />
          </Form.Group>
          <Form.Group inline>
            <Form.Checkbox
              checked={inputs.AutomaticDisableChannelEnabled === 'true'}
              label={t('setting.operation.monitor.auto_disable')}
              name='AutomaticDisableChannelEnabled'
              onChange={handleInputChange}
            />
            <Form.Checkbox
              checked={inputs.AutomaticEnableChannelEnabled === 'true'}
              label={t('setting.operation.monitor.auto_enable')}
              name='AutomaticEnableChannelEnabled'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button
            onClick={() => {
              submitConfig('monitor').then();
            }}
          >
            {t('setting.operation.monitor.buttons.save')}
          </Form.Button>

          <Divider />
          <Header as='h3'>通用设置</Header>
          <Form.Group widths={4}>
            <Form.Input
              label={t('setting.operation.general.chat_link')}
              name='ChatLink'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.ChatLink}
              type='link'
              placeholder={t('setting.operation.general.chat_link_placeholder')}
            />
            <Form.Input
              label={t('setting.operation.general.retry_times')}
              name='RetryTimes'
              type={'number'}
              step='1'
              min='0'
              onChange={handleInputChange}
              autoComplete='new-password'
              value={inputs.RetryTimes}
              placeholder={t(
                'setting.operation.general.retry_times_placeholder'
              )}
            />
          </Form.Group>
          <Form.Group inline>
            <Form.Checkbox
              checked={inputs.DisplayTokenStatEnabled === 'true'}
              label={t('setting.operation.general.display_token_stat')}
              name='DisplayTokenStatEnabled'
              onChange={handleInputChange}
            />
            <Form.Checkbox
              checked={inputs.ApproximateTokenEnabled === 'true'}
              label={t('setting.operation.general.approximate_token')}
              name='ApproximateTokenEnabled'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button
            onClick={() => {
              submitConfig('general').then();
            }}
          >
            {t('setting.operation.general.buttons.save')}
          </Form.Button>
        </Form>
      </Grid.Column>
    </Grid>
  );
};

export default OperationSetting;
