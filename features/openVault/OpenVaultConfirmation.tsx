import { Details } from 'components/forms/Details'
import { formatAmount, formatCryptoBalance, formatPercent } from 'helpers/formatters/format'
import { zero } from 'helpers/zero'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Grid, Text } from 'theme-ui'

import { OpenVaultState } from './openVault'
import { TxStatusCardProgress, TxStatusCardSuccess } from './TxStatusCard'

export function OpenVaultConfirmation({
  balanceInfo: { collateralBalance },
  depositAmount,
  generateAmount,
  token,
  afterCollateralizationRatio,
  afterLiquidationPrice,
  collateralBalanceRemaining,
  vaultWillBeAtRiskLevelWarning,
  vaultWillBeAtRiskLevelDanger,
}: OpenVaultState) {
  const walletBalance = formatCryptoBalance(collateralBalance)
  const intoVault = formatCryptoBalance(depositAmount || zero)
  const remainingInWallet = formatCryptoBalance(collateralBalanceRemaining)
  const daiToBeGenerated = formatCryptoBalance(generateAmount || zero)
  const afterCollRatio = afterCollateralizationRatio.eq(zero)
    ? '--'
    : formatPercent(afterCollateralizationRatio.times(100), { precision: 2 })

  const afterLiqPrice = formatAmount(afterLiquidationPrice, 'USD')
  const { t } = useTranslation()

  const vaultRiskColor = vaultWillBeAtRiskLevelDanger
    ? 'banner.danger'
    : vaultWillBeAtRiskLevelWarning
    ? 'banner.warning'
    : 'onSuccess'

  return (
    <Grid>
      <Details>
        <Details.Item label={t('system.in-your-wallet')} value={`${walletBalance} ${token}`} />
        <Details.Item label={t('moving-into-vault')} value={`${intoVault} ${token}`} />
        <Details.Item label={t('remaining-in-wallet')} value={`${remainingInWallet} ${token}`} />
        <Details.Item label={t('dai-being-generated')} value={`${daiToBeGenerated} DAI`} />
        <Details.Item
          label={t('system.collateral-ratio')}
          value={<Text sx={{ color: vaultRiskColor }}>{afterCollRatio}</Text>}
        />
        <Details.Item label={t('system.liquidation-price')} value={`$${afterLiqPrice}`} />
      </Details>
    </Grid>
  )
}

export function OpenVaultStatus({ stage, id, etherscan, openTxHash }: OpenVaultState) {
  const { t } = useTranslation()
  if (stage === 'openInProgress') {
    return (
      <TxStatusCardProgress
        text={t('creating-your-vault')}
        etherscan={etherscan!}
        txHash={openTxHash!}
      />
    )
  }
  if (stage === 'openSuccess') {
    return (
      <TxStatusCardSuccess
        text={t('vault-created', { id: id?.toString() })}
        etherscan={etherscan!}
        txHash={openTxHash!}
      />
    )
  }
  return null
}
