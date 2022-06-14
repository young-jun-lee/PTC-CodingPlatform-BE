import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, html: string) {
	let transporter = nodemailer.createTransport({
		host: "smtp.gmail.com",
		port: 465,
		secure: true,
		auth: {
			// ADD THE EMAIL HERE
			user: process.env.MAIL_USER,
			pass: process.env.MAIL_PASS,
		},
	});

	// let info = await transporter.sendMail({
	// 	from: '"Fred Foo 👻" <foo@example.com>', // sender address
	// 	to: to, // list of receivers
	// 	subject: "Change Password", // Subject line
	// 	html: html,
	// });

	const mailOptions = {
		from: `Project Tech Conferences ${process.env.MAIL_USER}`,
		to: to, // list of receivers
		subject: subject, // Subject line
		html: html,
	};

	transporter.sendMail(mailOptions, function (error, info) {
		if (error) {
			console.log(error);
		} else {
			console.log("Email sent: " + info.response);
		}
	});
	// console.log("Message sent: %s", info.messageId);
	// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

	// Preview only available when sending through an Ethereal account
	// console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
	// Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}
