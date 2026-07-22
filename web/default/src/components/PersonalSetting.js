import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Divider,
  Form,
  Header,
  Image,
  Message,
  Modal,
} from 'semantic-ui-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  API,
  copy,
  showError,
  showInfo,
  showNotice,
  showSuccess,
} from '../helpers';
import Turnstile from 'react-turnstile';
import { UserContext } from '../context/User';
import { onGitHubOAuthClicked, onLarkOAuthClicked } from './utils';

const PersonalSetting = () => {
  const { t } = useTranslation();
  const [userState, userDispatch] = useContext(UserContext);
  let navigate = useNavigate();

  const [inputs, setInputs] = useState({
    wechat_verification_code: '',
    self_account_deletion_confirmation: '',
  });
  const [status, setStatus] = useState({});
  const [showWeChatBindModal, setShowWeChatBindModal] = useState(false);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [disableButton, setDisableButton] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [systemToken, setSystemToken] = useState('');

  useEffect(() => {
    let status = localStorage.getItem('status');
    if (status) {
      status = JSON.parse(status);
      setStatus(status);
      if (status.turnstile_check) {
        setTurnstileEnabled(true);
        setTurnstileSiteKey(status.turnstile_site_key);
      }
    }
  }, []);

  useEffect(() => {
    let countdownInterval = null;
    if (disableButton && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      setDisableButton(false);
      setCountdown(30);
    }
    return () => clearInterval(countdownInterval); // Clean up on unmount
  }, [disableButton, countdown]);

  const handleInputChange = (e, { name, value }) => {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  };

  const generateAccessToken = async () => {
    const res = await API.get('/api/user/token');
    const { success, message, data } = res.data;
    if (success) {
      setSystemToken(data);
      await copy(data);
      showSuccess(`令牌已重置并已复制到剪贴板`);
    } else {
      showError(message);
    }
  };

  const handleSystemTokenClick = async (e) => {
    e.target.select();
    await copy(e.target.value);
    showSuccess(`系统令牌已复制到剪切板`);
  };

  const deleteAccount = async () => {
    if (inputs.self_account_deletion_confirmation !== userState.user.username) {
      showError('请输入你的账户名以确认删除！');
      return;
    }

    const res = await API.delete('/api/user/self');
    const { success, message } = res.data;

    if (success) {
      showSuccess('账户已删除！');
      await API.get('/api/user/logout');
      userDispatch({ type: 'logout' });
      localStorage.removeItem('user');
      navigate('/login');
    } else {
      showError(message);
    }
  };

  const bindWeChat = async () => {
    if (inputs.wechat_verification_code === '') return;
    const res = await API.get(
      `/api/oauth/wechat/bind?code=${inputs.wechat_verification_code}`
    );
    const { success, message } = res.data;
    if (success) {
      showSuccess('微信账户绑定成功！');
      setShowWeChatBindModal(false);
    } else {
      showError(message);
    }
  };

  return (
    <div style={{ lineHeight: '40px' }}>
      <Header as='h3'>{t('setting.personal.general.title')}</Header>
      <Message>{t('setting.personal.general.system_token_notice')}</Message>
      <Button as={Link} to={`/user/edit`}>
        {t('setting.personal.general.buttons.update_profile')}
      </Button>
      <Button onClick={generateAccessToken}>
        {t('setting.personal.general.buttons.generate_token')}
      </Button>

      {systemToken && (
        <Form.Input
          fluid
          readOnly
          value={systemToken}
          onClick={handleSystemTokenClick}
          style={{ marginTop: '10px' }}
        />
      )}
    </div>
  );
};

export default PersonalSetting;
