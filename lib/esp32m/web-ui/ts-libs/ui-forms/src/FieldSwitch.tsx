import { Switch, FormControlLabel, SwitchProps } from '@mui/material';
import { getIn, useFormikContext } from 'formik';

import { FormValues, FieldProps } from './types';
import { useTranslation } from '@ts-libs/ui-i18n';

export const FieldSwitch = (props: FieldProps<SwitchProps>) => {
  const { name, label, ...rest } = props;
  const controller = useFormikContext<FormValues>();
  const { t } = useTranslation();
  const { values, handleChange: onChange, handleBlur: onBlur } = controller;
  let checked = name && getIn(values, name);
  if (checked === undefined) checked = false;
  const p = {
    name,
    checked,
    onChange,
    onBlur,
    ...rest,
  };
  return (
    <FormControlLabel control={<Switch {...p} />} label={t(label || '')} />
  );
};
