// screens/TermsPrivacyScreen.js
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // for arrows
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

import { moderateScale } from 'react-native-size-matters';


export default function TermsPrivacyScreen() {
  const navigation = useNavigation();

  const sections = [
    {
      title: 'Welcome to Task2Earn',
      content: `This document combines our User/Earner Agreement and Privacy Policy to explain your rights, obligations, and how we handle your information. By creating an account or using Task2Earn, you agree to the terms below.`
    },
    {
      title: '1. Independent Contractor Status',
      content: `Users of Task2Earn are independent contractors, not employees, partners, or agents of Task2Earn.\n\nNothing in this agreement creates:\n- An employment relationship\n- A salary or wage obligation\n- A guarantee of income\n\nParticipation is voluntary, and earnings depend solely on completed and approved tasks.`
    },
    {
      title: '2. Account Eligibility & Authenticity',
      content: `Users must provide accurate personal and account information for identity verification and fraud prevention.\n\nRequired information may include:\n- Full name, email, phone number\n- Country of residence\n- Social media and other platforms account details (where tasks require engagement)\n\nOne Account Per User: Each person may only maintain one Task2Earn account. Multiple accounts will result in:\n- Immediate account suspension\n- Permanent ban\n- Forfeiture of all balances`
    },
    {
      title: '3. Honest Task Completion',
      content: `Users must complete tasks personally and honestly, in full compliance with task instructions.\n\nProhibited actions include:\n- Fake, edited, or reused proofs\n- Automation, bots, scripts, or account farming\n- Impersonation of others`
    },
    {
      title: '4. Task Verification & Final Approval (Up to 30 Days)',
      content: `All task submissions are subject to a verification period of up to 30 days.\n\nPurpose of the 30-Day Period:\n- Confirm genuine task completion\n- Detect fraud or manipulation\n- Allow advertisers sufficient time to verify results\n- Ensure compliance with long-term engagement requirements\n- Maintain fairness for all participants\n\n> Approval before 30 days is possible but not guaranteed.`
    },
    {
      title: '5. Admin Rights & Earnings Control',
      content: `Task2Earn reserves the right to:\n- Approve or reject any submission\n- Reverse or deduct earnings at any time\n- Freeze or terminate accounts under investigation\n\nAll administrative decisions are final and binding.`
    },
    {
      title: '6. Engagement Retention Requirement',
      content: `Users agree that any engagement performed as part of a task (follows, likes, comments, subscriptions, app installs) must remain active even after withdrawal of earnings.\n\nViolation Consequences:\n- Considered fraudulent activity\n- Earnings may be deducted\n- Permanent ban possible\n- Legal action may be pursued`
    },
    {
      title: '7. No Guaranteed Income',
      content: `Task2Earn does not guarantee:\n- Task availability\n- Approval of submissions\n- Minimum or expected earnings\n\nEarnings depend on task availability, performance, and compliance.`
    },
    {
      title: '8. Fraud & Violations',
      content: `Any form of fraud or policy violation may result in:\n- Immediate account termination\n- Forfeiture of pending and available balances\n- Loss of withdrawal privileges\n\nNo compensation will be provided in case of violations.`
    },
    {
      title: '9. Withdrawals',
      content: `Withdrawals are subject to:\n- Verification and security checks\n- Valid and accurate payment details\n\nWithdrawals may be delayed due to suspicious activity or incorrect user info.`
    },
    {
      title: '10. Data Collection, Privacy & Compliance',
      content: `Users provide personal information for account creation, verification, and task management. Information collected may include:\n- Name, email, phone, date of birth, country, bank/payment info, profile photo\n- Device and app usage info, IP, cookies, location data\n\nPurpose:\n- Fraud prevention, task verification, platform operations\n- Personalized experience and relevant task suggestions\n- Marketing communications (with consent)\n\nCompliance with Privacy Laws:\nTask2Earn collects, processes, and stores your data in line with Nigeria’s NDPR and international standards including GDPR for EU residents.\n\nUsers may access or update their information via the Task2Earn dashboard or request deletion via support@task2earn.com.\nData is stored securely and protected against unauthorized access, theft, or cyber threats.`
    },
    {
      title: '11. Third-Party Access',
      content: `We may share limited data with trusted partners (e.g., Google, affiliates) for:\n- Service improvement\n- Analytics and fraud detection\n- Personalized offers and ads\n\nAll shared data remains under Task2Earn supervision.`
    },
    {
      title: '12. Agreement Acceptance',
      content: `By using Task2Earn, users confirm that they:\n- Have read and understood this agreement\n- Agree to honest task completion and engagement retention rules\n- Accept that violations may result in penalties, account suspension, or legal action`
    },
    {
      title: '13. Contact Us',
      content: `Questions or concerns? Contact Task2Earn at: support@task2earn.com`
    },
    {
      title: '14. Legal & Copyright',
      content: `© 2026 Task2Earn. All rights reserved.\nAll trademarks, logos, and branding belong to Task2Earn. Use of the Platform constitutes agreement to these terms, privacy rules, and user policies.\nAll payouts are considered royalty-like earnings under applicable laws.`
    },
    {
      title: '15. Task Poster / Advertiser Agreement',
      content: `Applicable to users who post and fund tasks on Task2Earn. If you do not post tasks, this section does not apply to you.\n\n1. Funding Requirement\n- All task posters must deposit full task funding before tasks go live.\n- Tasks will not be published without sufficient funds.\n\n2. Task Instructions\n- Clear, accurate, and lawful task instructions\n- Honest descriptions of required actions\n- Misleading, deceptive, or illegal tasks are strictly prohibited.\n\n3. Admin Review & Rejection Rights\n- Task2Earn reserves the right to reject or modify any task\n- Remove tasks that violate platform rules\n- Suspend advertiser accounts for abuse\n- Admin decisions are final and binding.\n\n4. No Guaranteed Results\n- Task2Earn does not guarantee sales, engagement, traffic, or conversions\n- Specific performance outcomes\n- Task2Earn only provides access to task participants, not marketing success.\n\n5. Refund Policy\n- Once task execution or approval begins, funds are non-refundable\n- Refunds (if any) are at Task2Earn’s sole discretion\n- No refunds for dissatisfaction with results\n\n6. Chargebacks & Disputes\n- Unauthorized chargebacks or payment disputes may result in account suspension, permanent advertiser ban, or loss of remaining balance.\n\n7. Advertiser Responsibility\n- Advertisers confirm that they own or have rights to promoted content\n- Are legally allowed to promote such content\n- Will indemnify Task2Earn against claims arising from their tasks`
    }
  ];

  // State for collapsed/expanded sections
  const [expanded, setExpanded] = useState(Array(sections.length).fill(false));

  const toggleSection = (index) => {
    const newExpanded = [...expanded];
    newExpanded[index] = !newExpanded[index];
    setExpanded(newExpanded);
  };

  return (
    <ScrollView
  style={styles.container}
  contentContainerStyle={styles.contentContainer}
  showsVerticalScrollIndicator={false}
>

      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Header */}
      <Text style={styles.header}>Task2Earn Terms & Privacy</Text>

      {/* Collapsible sections */}
      {sections.map((section, index) => (
        <View key={index} style={styles.section}>
          <Pressable onPress={() => toggleSection(index)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Ionicons
              name={expanded[index] ? 'chevron-up' : 'chevron-down'}
              size={moderateScale(20)}
              color="#FFD700"
            />
          </Pressable>
          {expanded[index] && <Text style={styles.text}>{section.content}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
 container: {
  flex: 1,
  backgroundColor: '#121212',
  paddingHorizontal: wp('9%'),
},


  backButton: {
    marginBottom: hp('1%'),
  },

  backText: {
    color: '#FFD700',
    fontSize: moderateScale(16),
  },

  header: {
    fontSize: moderateScale(24),
    color: '#00BFA6',
    fontWeight: 'bold',
    marginBottom: hp('2%'),
    textAlign: 'center',
  },

  section: {
    marginBottom: hp('2%'),
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
    paddingBottom: hp('1%'),
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: moderateScale(18),
    color: '#FFD700',
    fontWeight: 'bold',
    flex: 1,
    paddingRight: wp('2%'),
  },

  text: {
    color: '#ccc',
    fontSize: moderateScale(14),
    marginTop: hp('1%'),
    lineHeight: moderateScale(22),
  },

  contentContainer: {
  paddingTop: hp('2%'),
  paddingBottom: hp('8%'), // 👈 THIS fixes your last line issue
},

});

