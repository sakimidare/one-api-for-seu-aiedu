import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Divider,
  Form,
  Grid,
  Header,
  Message,
} from 'semantic-ui-react';
import { API, removeTrailingSlash, showError } from '../helpers';

const SystemSetting = () => {
  const { t } = useTranslation();
  let [inputs, setInputs] = useState({
    ServerAddress: '',
    SMTPServer: '',
    SMTPPort: '',
    SMTPAccount: '',
    SMTPFrom: '',
    SMTPToken: '',
  });
  const [originInputs, setOriginInputs] = useState({});
  let [loading, setLoading] = useState(false);

  const getOptions = async () => {
    const res = await API.get('/api/option/');
    const { success, message, data } = res.data;
    if (success) {
      let newInputs = {};
      data.forEach((item) => {
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
    const res = await API.put('/api/option/', { key, value });
    const { success, message } = res.data;
    if (success) {
      setInputs((inputs) => ({ ...inputs, [key]: value }));
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const handleInputChange = async (e, { name, value }) => {
    if (
      name === 'SMTPServer' ||
      name === 'SMTPPort' ||
      name === 'SMTPAccount' ||
      name === 'SMTPFrom' ||
      name === 'SMTPToken' ||
      name === 'ServerAddress'
    ) {
      setInputs((inputs) => ({ ...inputs, [name]: value }));
    }
  };

  const submitServerAddress = async () => {
    let addr = removeTrailingSlash(inputs.ServerAddress);
    await updateOption('ServerAddress', addr);
  };

  const submitSMTP = async () => {
    if (originInputs['SMTPServer'] !== inputs.SMTPServer)
      await updateOption('SMTPServer', inputs.SMTPServer);
    if (originInputs['SMTPAccount'] !== inputs.SMTPAccount)
      await updateOption('SMTPAccount', inputs.SMTPAccount);
    if (originInputs['SMTPFrom'] !== inputs.SMTPFrom)
      await updateOption('SMTPFrom', inputs.SMTPFrom);
    if (originInputs['SMTPPort'] !== inputs.SMTPPort && inputs.SMTPPort !== '')
      await updateOption('SMTPPort', inputs.SMTPPort);
    if (originInputs['SMTPToken'] !== inputs.SMTPToken && inputs.SMTPToken !== '')
      await updateOption('SMTPToken', inputs.SMTPToken);
  };

  return (
    <Grid columns={1}>
      <Grid.Column>
        <Form loading={loading}>
          <Header as='h3'>{t('setting.system.general.title')}</Header>
          <Form.Group widths='equal'>
            <Form.Input
              label={t('setting.system.general.server_address')}
              placeholder={t('setting.system.general.server_address_placeholder')}
              value={inputs.ServerAddress}
              name='ServerAddress'
              onChange={handleInputChange}
            />
          </Form.Group>
          <Form.Button onClick={submitServerAddress}>
            {t('setting.system.general.buttons.update')}
          </Form.Button>

          <Divider />
          <Header as='h3'>{t('setting.system.smtp.title')}</Header>
          <Message>{t('setting.system.smtp.subtitle')}</Message>
          <Form.Group widths={3}>
            <Form.Input
              label={t('setting.system.smtp.server')}
              placeholder={t('setting.system.smtp.server_placeholder')}
              name='SMTPServer'
              onChange={handleInputChange}
              value={inputs.SMTPServer}
            />
            <Form.Input
              label={t('setting.system.smtp.port')}
              placeholder={t('setting.system.smtp.port_placeholder')}
              name='SMTPPort'
              onChange={handleInputChange}
              value={inputs.SMTPPort}
            />
            <Form.Input
              label={t('setting.system.smtp.account')}
              placeholder={t('setting.system.smtp.account_placeholder')}
              name='SMTPAccount'
              onChange={handleInputChange}
              value={inputs.SMTPAccount}
            />
          </Form.Group>
          <Form.Group widths={3}>
            <Form.Input
              label={t('setting.system.smtp.from')}
              placeholder={t('setting.system.smtp.from_placeholder')}
              name='SMTPFrom'
              onChange={handleInputChange}
              value={inputs.SMTPFrom}
            />
            <Form.Input
              label={t('setting.system.smtp.token')}
              placeholder={t('setting.system.smtp.token_placeholder')}
              name='SMTPToken'
              onChange={handleInputChange}
              type='password'
              value={inputs.SMTPToken}
            />
          </Form.Group>
          <Form.Button onClick={submitSMTP}>
            {t('setting.system.smtp.buttons.save')}
          </Form.Button>
        </Form>
      </Grid.Column>
    </Grid>
  );
};

export default SystemSetting;
