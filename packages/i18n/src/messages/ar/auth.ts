import type { auth as source } from "../en/auth";
import { plural } from "../../plural";

export const auth = {
  clerkError: {
    generic: "حدث خطأ ما. حاول مرة أخرى.",
    identifierNotFound: "لا يوجد حساب مطابق. جرّب بيانات أخرى، أو أنشئ حسابًا.",
    identifierExists:
      "يوجد حساب بهذه البيانات بالفعل. سجّل الدخول بدلًا من ذلك.",
    codeIncorrect: "هذا الرمز غير صحيح. حاول مرة أخرى.",
    verificationExpired: "انتهت صلاحية هذا الرمز. اطلب رمزًا جديدًا.",
    verificationFailed: "محاولات خاطئة كثيرة. حاول مرة أخرى لاحقًا.",
    tooManyRequests: "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.",
    paramFormatInvalid: "يبدو أن هناك خطأ. تحقق من الصيغة وحاول مرة أخرى.",
    passwordIncorrect: "كلمة المرور غير صحيحة.",
    passwordPwned: "ظهرت كلمة المرور هذه في تسريب بيانات. اختر كلمة مرور أخرى.",
  },
  country: {
    bh: "البحرين",
    kw: "الكويت",
    sa: "المملكة العربية السعودية",
    ae: "الإمارات العربية المتحدة",
    qa: "قطر",
    om: "عُمان",
    us: "الولايات المتحدة",
  },
  resendCode: "إعادة إرسال الرمز",
  resendCodeAvailableIn: (seconds: number) =>
    plural("ar", seconds, {
      one: "إعادة إرسال الرمز، متاحة بعد ثانية واحدة",
      two: "إعادة إرسال الرمز، متاحة بعد ثانيتين",
      few: "إعادة إرسال الرمز، متاحة بعد {n} ثوانٍ",
      many: "إعادة إرسال الرمز، متاحة بعد {n} ثانية",
      other: "إعادة إرسال الرمز، متاحة بعد {n} ثانية",
    }),
} satisfies typeof source;
